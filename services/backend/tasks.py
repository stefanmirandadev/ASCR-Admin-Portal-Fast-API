from celery import Celery
from celery.utils.log import get_task_logger
import openai
import json
import redis
import os
import time
from datetime import datetime, date
from typing import Dict, Any
import httpx
from celery import Task
import curate
import utils
import asyncio
import logging
from validation import CellLineValidation
from storage import FileStorage
from config_manager import config_manager
from task_progress import TaskProgressManager

# Set up detailed logging
logger = get_task_logger(__name__)
logger.setLevel(logging.INFO)

# Configure OpenAI Agents SDK logging
logging.getLogger("agents").setLevel(logging.INFO)
logging.getLogger("openai").setLevel(logging.INFO)

def _json_serializer(obj):
    """Custom JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def broadcast_task_completion(task_id: str, filename: str, result: Any):
    """Notify WebSocket clients about task completion"""
    try:
        # Send message to FastAPI WebSocket manager via HTTP
        payload = {
            "type": "task_completed",
            "task_id": task_id,
            "filename": filename,
            "result": result,
            "timestamp": datetime.now().isoformat()
        }

        # Serialize with custom handler for dates
        payload_json = json.loads(json.dumps(payload, default=_json_serializer))

        # Use httpx to notify the main FastAPI app (use service name in Docker)
        with httpx.Client(timeout=5.0) as client:
            response = client.post(
                "http://backend:8001/internal/broadcast-task-completion",
                json=payload_json
            )
            print(f"Broadcasted task completion for {task_id}: {response.status_code}")
    except Exception as e:
        print(f"Failed to broadcast task completion: {e}")

# Celery app
celery_app = Celery(
    "curation_tasks",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0")
)

# Redis connection
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

def get_openai_client():
    """Get OpenAI client with current config"""
    api_key = config_manager.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API key not configured. Please set it in Settings.")
    return openai.OpenAI(api_key=api_key)


def update_job_status(job_id: str, status: str, result: Dict = None, error: str = None):
    """Update job status in Redis"""
    job_data = redis_client.get(f"job:{job_id}")
    if job_data:
        job_info = json.loads(job_data)
        job_info.update({
            "status": status,
            "updated_at": datetime.now().isoformat(),
            "result": result,
            "error": error
        })
        redis_client.setex(f"job:{job_id}", 3600, json.dumps(job_info))


def _save_cell_lines(validated_results: list) -> Dict[str, Any]:
    """Save validated cell lines using FileStorage"""
    storage = FileStorage()
    saved_files = []
    save_errors = 0

    for result in validated_results:
        try:
            cell_line_id = result.get("cell_line_id", "unknown")
            validation_status = result.get("validation_status")

            # Only process successfully validated cell lines
            if validation_status != "success":
                logger.warning(f"Skipping save for {cell_line_id} - validation status: {validation_status}")
                saved_files.append({
                    "hpscreg_name": cell_line_id,
                    "filename": None,
                    "status": "skipped",
                    "reason": f"Validation failed: {validation_status}"
                })
                continue

            validated_data = result.get("validated_data", {})
            if not validated_data:
                logger.warning(f"No validated data for {cell_line_id}")
                saved_files.append({
                    "hpscreg_name": cell_line_id,
                    "filename": None,
                    "status": "skipped",
                    "reason": "No validated data"
                })
                continue

            # Extract filename from validated_data (hpscreg_name from cell_line)
            cell_line_list = validated_data.get("cell_line", [])
            if cell_line_list and cell_line_list[0].get("hpscreg_name"):
                filename = cell_line_list[0]["hpscreg_name"]
            else:
                filename = cell_line_id

            # Use FileStorage to create the cell line
            create_result = storage.create(filename, validated_data, "working")

            saved_files.append({
                "hpscreg_name": cell_line_id,
                "filename": f"{filename}.json",
                "status": "success"
            })

            logger.info(f"Successfully saved cell line '{cell_line_id}' to {filename}.json")

        except FileExistsError:
            # File already exists - try update instead
            try:
                storage.update(filename, validated_data, "working")
                saved_files.append({
                    "hpscreg_name": cell_line_id,
                    "filename": f"{filename}.json",
                    "status": "success"
                })
                logger.info(f"Updated existing cell line '{cell_line_id}' at {filename}.json")
            except Exception as e:
                save_errors += 1
                error_msg = f"Failed to update cell line: {str(e)}"
                logger.error(error_msg)
                saved_files.append({
                    "hpscreg_name": cell_line_id,
                    "filename": None,
                    "status": "failed",
                    "error": error_msg
                })

        except Exception as e:
            save_errors += 1
            error_msg = f"Failed to save cell line: {str(e)}"
            logger.error(error_msg)

            saved_files.append({
                "hpscreg_name": result.get("cell_line_id", "unknown"),
                "filename": None,
                "status": "failed",
                "error": error_msg
            })

    total_saved = len([f for f in saved_files if f["status"] == "success"])

    return {
        "total_saved": total_saved,
        "files_saved": saved_files,
        "save_errors": save_errors
    }


@celery_app.task(name="curation.curate_article_task", bind=True)
def curate_article_task(self: Task, filename: str, file_data: bytes):
    """
    Curate cell line metadata from a PDF article using OpenAI Agents SDK.

    Args:
        filename: Name of the uploaded PDF file
        file_data: PDF bytes

    Returns:
        Dict containing curation results or error information
    """

    task_id = self.request.id
    logger.info(f"Starting curation task {task_id} for file: {filename}")

    # Initialize task progress manager
    progress = TaskProgressManager(redis_client)
    progress.create_task(task_id, filename, file_data)
    progress.update_task_status(task_id, "processing")

    async def _curate_article_async():
        start_time = time.time()

        try:
            # Load API keys from config_manager and set as environment variables
            # This is required for the agents library to access OpenAI
            openai_key = config_manager.get("OPENAI_API_KEY")
            if not openai_key or openai_key == "your_openai_api_key_here":
                raise ValueError("OpenAI API key not configured. Please set it in Settings.")
            os.environ["OPENAI_API_KEY"] = openai_key

            # Stage 1: Upload PDF
            progress.update_stage(task_id, "uploading", "processing", "Uploading file to OpenAI...")
            pdf_info = await curate.validate_and_upload_pdf(filename, file_data)
            progress.update_stage(task_id, "uploading", "completed", "File uploaded successfully")

            # Stage 2: Initialize agents
            progress.update_stage(task_id, "initializing", "processing", "Initializing AI agents...")
            identification_agent, curation_agent, normalization_agent = curate.initialize_agents()
            progress.update_stage(task_id, "initializing", "completed", "Agents initialized")

            # Stage 3: Identify cell lines
            progress.update_stage(task_id, "identifying", "processing", "Identifying cell lines...")
            cell_lines = await curate.identify_cell_lines(pdf_info, identification_agent)
            progress.update_stage(
                task_id, "identifying", "completed",
                f"Found {len(cell_lines)} cell line{'' if len(cell_lines) == 1 else 's'}",
                {"cell_lines": cell_lines}
            )

            # Stage 4: Curate each cell line
            progress.update_stage(
                task_id, "curating", "processing",
                f"Curating {len(cell_lines)} cell line{'' if len(cell_lines) == 1 else 's'}...",
                {"cell_lines": [{"name": cl, "status": "pending"} for cl in cell_lines]}
            )

            curated_data = await curate.curate_cell_lines(pdf_info, curation_agent, cell_lines)

            progress.update_stage(
                task_id, "curating", "completed",
                "All cell lines curated",
                {"cell_lines": [{"name": cl, "status": "completed"} for cl in cell_lines]}
            )

            # Stage 5: Normalize metadata
            progress.update_stage(task_id, "normalizing", "processing", "Normalizing metadata...")
            normalized_data = await curate.normalize_metadata(curated_data, normalization_agent)
            progress.update_stage(task_id, "normalizing", "completed", "Normalization complete")

            # Stage 6: Validate
            progress.update_stage(task_id, "validating", "processing", "Validating data...")
            validator = CellLineValidation()
            validated_data = []
            for cell_line in normalized_data:
                validation_result = validator.validate(cell_line)
                validated_data.append(validation_result)
            progress.update_stage(task_id, "validating", "completed", "Validation complete")

            # Stage 7: Prepare result
            result = await curate.cleanup_and_prepare_result(pdf_info, validated_data, start_time, cell_lines)
            result["task_id"] = task_id

            return result

        except Exception as e:
            total_time = time.time() - start_time
            error_msg = f"Curation task failed: {str(e)}"
            logger.error(f"{error_msg}", exc_info=True)

            # Update failed stage
            progress.update_stage(task_id, "error", "failed", error_msg)
            progress.update_task_status(task_id, "failed", error=error_msg)

            # Cleanup on error if pdf_info exists
            try:
                if 'pdf_info' in locals():
                    await pdf_info.client.files.delete(pdf_info.file_id)
                    logger.info(f"Cleaned up uploaded file on error: {pdf_info.file_id}")
            except:
                pass

            return {
                "status": "error",
                "task_id": task_id,
                "filename": filename,
                "error": error_msg,
                "total_processing_time": total_time
            }

    # Run the async function
    logger.info(f"Executing async curation function for task {task_id}")
    result = asyncio.run(_curate_article_async())

    # Stage 8: Save cell lines to files
    if result.get("status") == "success" and result.get("results"):
        progress.update_stage(task_id, "saving", "processing", "Saving cell lines to files...")
        logger.info(f"Saving {len(result['results'])} cell lines to files using datastore")
        saved_files_info = _save_cell_lines(result["results"])
        result["saved_files"] = saved_files_info
        logger.info(f"Saved {saved_files_info['total_saved']} cell lines with {saved_files_info['save_errors']} errors")
        progress.update_stage(
            task_id, "saving", "completed",
            f"Saved {saved_files_info['total_saved']} cell lines",
            {"files_saved": saved_files_info["files_saved"]}
        )

        # Mark task as completed
        progress.update_task_status(task_id, "completed", result=result)
        progress.update_stage(task_id, "complete", "completed", "Task completed successfully")
    else:
        # Task failed
        progress.update_task_status(task_id, "failed", error=result.get("error"))

    # Broadcast completion (legacy support)
    logger.info(f"Broadcasting task completion for {task_id}")
    broadcast_task_completion(task_id, filename, result)

    logger.info(f"Task {task_id} completed successfully")
    return result


@celery_app.task(bind=True)
def curate_text_task(self, job_id: str, text_content: str, instructions: str = None):
    """
    Celery task to curate text content using OpenAI
    """
    try:
        update_job_status(job_id, "processing")
        
        start_time = time.time()
        
        # Load curation instructions
        default_instructions = load_curation_instructions()
        prompt_instructions = instructions or default_instructions
        
        # Create OpenAI prompt
        system_prompt = f"""
You are an expert in stem cell research and data curation. Your task is to extract cell line information from scientific text.

{prompt_instructions}

Return your response as a JSON object with this structure:
{{
    "cell_lines": [
        {{
            "CellLine_hpscreg_id": "extracted_id_or_generated",
            "CellLine_cell_line_type": "hESC or hiPSC",
            "CellLine_source_cell_type": "...",
            // ... other fields as specified in instructions
        }}
    ],
    "metadata": {{
        "confidence_score": 0.85,
        "extraction_notes": "Any notes about the extraction process",
        "total_cell_lines_found": 1
    }}
}}
"""
        
        # Call OpenAI API
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract cell line data from this text:\n\n{text_content}"}
            ],
            temperature=0.1,
            max_tokens=4000
        )
        
        # Parse response
        response_text = response.choices[0].message.content
        
        try:
            curation_result = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON from response if it's wrapped in markdown
            import re
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                curation_result = json.loads(json_match.group(1))
            else:
                raise ValueError("Could not parse JSON from OpenAI response")
        
        processing_time = time.time() - start_time
        
        # Add processing metadata
        curation_result["metadata"]["processing_time"] = processing_time
        curation_result["metadata"]["processed_at"] = datetime.now().isoformat()
        
        # Store results in archive service
        if curation_result.get("cell_lines"):
            archive_service_url = os.getenv("ARCHIVE_SERVICE_URL", "http://localhost:8002")
            with httpx.Client() as client:
                for cell_line in curation_result["cell_lines"]:
                    cell_line["curation_source"] = "LLM"
                    cell_line["work_status"] = "for review"
                    
                    # Save to archive
                    try:
                        response = client.post(
                            f"{archive_service_url}/cell-lines/",
                            json=cell_line,
                            timeout=30.0
                        )
                    except Exception as e:
                        print(f"Error saving to archive: {e}")
        
        update_job_status(job_id, "completed", curation_result)
        
        return curation_result
        
    except Exception as e:
        error_msg = f"Curation failed: {str(e)}"
        update_job_status(job_id, "failed", error=error_msg)
        raise self.retry(exc=e, countdown=60, max_retries=3)

def load_curation_instructions() -> str:
    """Load curation instructions from file"""
    instructions_path = "/app/data/curation_instructions.md"
    
    if os.path.exists(instructions_path):
        with open(instructions_path, 'r') as f:
            return f.read()
    
    # Default instructions if file not found
    return """
Extract cell line information with these fields:
- CellLine_hpscreg_id: Unique identifier
- CellLine_cell_line_type: Either "hESC" or "hiPSC"
- CellLine_source_cell_type: Type of source cell
- CellLine_source_tissue: Tissue of origin
- CellLine_donor_age: Age of donor
- CellLine_donor_sex: "male" or "female"
- Publication information if available
- Contact information if mentioned

Focus on accuracy and only extract information that is explicitly stated in the text.
"""
