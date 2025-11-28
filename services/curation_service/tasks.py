from celery import Celery
import openai
import json
import redis
import os
import time
from datetime import datetime
from typing import List, Dict, Any
import httpx

# Celery app
celery_app = Celery(
    "curation_tasks",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0")
)

# Redis connection
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

# OpenAI client
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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