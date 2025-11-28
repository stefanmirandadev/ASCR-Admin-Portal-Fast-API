from celery import Celery
import openai
import json
import redis
import os
import time
import httpx
import asyncio
from datetime import datetime
from typing import List, Dict, Any

# Celery app configuration
celery_app = Celery(
    "background_processor",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0")
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
)

# Redis connection
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

# OpenAI client
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Service URLs
CURATION_SERVICE_URL = os.getenv("CURATION_SERVICE_URL", "http://localhost:8001")
ARCHIVE_SERVICE_URL = os.getenv("ARCHIVE_SERVICE_URL", "http://localhost:8002")

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

@celery_app.task(bind=True)
def curate_text_task(self, job_id: str, text_content: str, instructions: str = None):
    """
    Main curation task that processes text content using OpenAI
    """
    try:
        update_job_status(job_id, "processing")
        
        start_time = time.time()
        
        # Load default instructions if none provided
        if not instructions:
            instructions = load_default_instructions()
        
        # Create OpenAI prompt
        system_prompt = f"""
You are an expert in stem cell research and data curation. Your task is to extract cell line information from scientific text.

{instructions}

Return your response as a valid JSON object with this exact structure:
{{
    "cell_lines": [
        {{
            "CellLine_hpscreg_id": "extracted_id_or_auto_generated",
            "CellLine_cell_line_type": "hESC or hiPSC",
            "CellLine_source_cell_type": "type_of_source_cell",
            "CellLine_source_tissue": "tissue_of_origin",
            "CellLine_donor_age": "age_as_string",
            "CellLine_donor_sex": "male or female",
            "CellLine_publication_title": "title_if_available",
            "CellLine_publication_doi": "doi_if_available"
        }}
    ],
    "metadata": {{
        "confidence_score": 0.85,
        "extraction_notes": "notes_about_extraction",
        "total_cell_lines_found": 1
    }}
}}

Only extract information that is explicitly stated in the text. Do not make assumptions.
"""
        
        # Call OpenAI API
        response = openai_client.chat.completions.create(
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
            # Try to extract JSON from markdown-wrapped response
            import re
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                curation_result = json.loads(json_match.group(1))
            else:
                raise ValueError(f"Could not parse JSON from OpenAI response: {response_text}")
        
        processing_time = time.time() - start_time
        
        # Add processing metadata
        if "metadata" not in curation_result:
            curation_result["metadata"] = {}
        
        curation_result["metadata"].update({
            "processing_time": processing_time,
            "processed_at": datetime.now().isoformat(),
            "openai_model": "gpt-4"
        })
        
        # Save cell lines to archive service
        saved_cell_lines = []
        if curation_result.get("cell_lines"):
            for cell_line_data in curation_result["cell_lines"]:
                try:
                    # Add curation metadata
                    cell_line_data["curation_source"] = "LLM"
                    cell_line_data["work_status"] = "for review"
                    
                    # Save to archive service
                    archive_result = save_to_archive(cell_line_data)
                    if archive_result:
                        saved_cell_lines.append(archive_result)
                        
                except Exception as e:
                    print(f"Error saving cell line {cell_line_data.get('CellLine_hpscreg_id', 'unknown')}: {e}")
        
        # Update result with saved cell lines info
        curation_result["metadata"]["saved_cell_lines"] = len(saved_cell_lines)
        curation_result["saved_cell_lines"] = saved_cell_lines
        
        update_job_status(job_id, "completed", curation_result)
        
        return curation_result
        
    except Exception as e:
        error_msg = f"Curation failed: {str(e)}"
        update_job_status(job_id, "failed", error=error_msg)
        
        # Retry with exponential backoff
        if self.request.retries < 3:
            countdown = 2 ** self.request.retries * 60  # 1 min, 2 min, 4 min
            raise self.retry(exc=e, countdown=countdown, max_retries=3)
        else:
            raise e

def save_to_archive(cell_line_data: Dict[str, Any]) -> Dict[str, Any]:
    """Save cell line data to archive service"""
    try:
        # Use synchronous httpx for Celery task
        with httpx.Client() as client:
            response = client.post(
                f"{ARCHIVE_SERVICE_URL}/cell-lines/",
                json=cell_line_data,
                timeout=30.0
            )
            
            if response.status_code == 201 or response.status_code == 200:
                return response.json()
            elif response.status_code == 409:
                # Cell line already exists, try to update
                hpscreg_id = cell_line_data.get("CellLine_hpscreg_id")
                if hpscreg_id:
                    update_response = client.put(
                        f"{ARCHIVE_SERVICE_URL}/cell-lines/{hpscreg_id}",
                        json=cell_line_data,
                        timeout=30.0
                    )
                    if update_response.status_code == 200:
                        return update_response.json()
                    
            print(f"Archive service error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Error saving to archive: {e}")
        return None

def load_default_instructions() -> str:
    """Load default curation instructions"""
    return """
Extract cell line information focusing on these key fields:

1. Cell Line Identification:
   - Look for cell line names, IDs, or registry numbers
   - Note the cell line type (hESC for embryonic, hiPSC for induced pluripotent)

2. Source Information:
   - Source cell type (e.g., fibroblasts, blood cells)
   - Source tissue (e.g., skin, peripheral blood)
   - Donor age and sex if mentioned

3. Publication Details:
   - Article title, DOI, authors if this is from a research paper

4. Contact Information:
   - Researcher names, institutions, email addresses if mentioned

Only extract information that is explicitly stated in the text. 
If a cell line ID is not provided, generate one in the format: "AUTO_GENERATED_[timestamp]"
"""

@celery_app.task
def health_check():
    """Simple health check task"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    celery_app.start()