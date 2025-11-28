from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import logging
from curate import curate_article
from models import CellLineData, CurationResponse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ASCR Curation Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class SingleArticleRequest(BaseModel):
    filename: str
    file_data: List[int]  # PDF file as bytes array

# Routes
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "curation_service"}

@app.get("/cellline-schema")
async def get_cellline_schema():
    """
    Generate schema for cell line data structure based on Pydantic models.
    This schema is used by the frontend editor component.
    """
    try:
        # Get the JSON schema from the Pydantic model
        schema = CellLineData.model_json_schema()
        
        # Transform Pydantic schema to editor-compatible format
        editor_schema = {}
        
        def transform_property(prop_name: str, prop_def: Dict[str, Any]) -> Dict[str, Any]:
            """Transform a Pydantic property definition to editor format"""
            field_schema = {
                "type": "JSONField",  # Default to JSONField for complex objects
                "required": prop_name in schema.get("required", []),
                "help_text": prop_def.get("description", "")
            }
            
            # Handle different types
            if prop_def.get("type") == "string":
                field_schema["type"] = "CharField"
                if "maxLength" in prop_def:
                    field_schema["max_length"] = prop_def["maxLength"]
                # Check for enum values
                if "enum" in prop_def:
                    field_schema["choices"] = prop_def["enum"]
            elif prop_def.get("type") == "integer":
                field_schema["type"] = "IntegerField"
            elif prop_def.get("type") == "boolean":
                field_schema["type"] = "BooleanField"
            elif prop_def.get("type") == "array":
                field_schema["type"] = "JSONField"
                field_schema["json_schema"] = prop_def
            
            return field_schema
        
        # Process all properties
        properties = schema.get("properties", {})
        for prop_name, prop_def in properties.items():
            editor_schema[prop_name] = transform_property(prop_name, prop_def)
        
        return {
            "schema": {
                "fields": editor_schema
            },
            "model_name": "CellLineData",
            "description": "Schema for curated cell line metadata"
        }
    
    except Exception as e:
        logger.error(f"Error generating schema: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schema generation failed: {str(e)}")

@app.post("/single_article_curate")
async def single_article_curate(request: SingleArticleRequest):
    """
    Curate cell line metadata from a PDF article using OpenAI vision.
    """
    try:
        logger.info(f"Starting curation for file: {request.filename}")
        
        # Convert file_data back to bytes
        pdf_bytes = bytes(request.file_data)
        file_size_kb = len(pdf_bytes) / 1024
        
        logger.info(f"Processing PDF: {request.filename} ({file_size_kb:.2f} KB)")
        
        # Call the curation function
        result = curate_article(pdf_bytes)
        
        # Handle different return types
        if result == -1:
            return {
                "status": "success",
                "message": "No cell lines found in the article",
                "filename": request.filename,
                "file_size_kb": round(file_size_kb, 2),
                "cell_lines_found": 0,
                "curated_data": None
            }
        elif isinstance(result, dict):
            # Check if it's an error response
            if "error" in result:
                return {
                    "status": "error",
                    "message": f"Curation failed: {result['error']}",
                    "filename": request.filename,
                    "file_size_kb": round(file_size_kb, 2),
                    "error": result["error"],
                    "usage_metadata": result.get("usage_metadata", {})
                }
            else:
                # Successfully curated data
                return {
                    "status": "success",
                    "message": "Curation completed successfully",
                    "filename": request.filename,
                    "file_size_kb": round(file_size_kb, 2),
                    "cell_lines_found": result.get("total_cell_lines", 0),
                    "successful_curations": result.get("successful_curations", 0),
                    "failed_cell_lines": result.get("failed_cell_lines", []),
                    "curated_data": result.get("curated_data", {}),
                    "usage_metadata": result.get("usage_metadata", {})
                }
        else:
            # Error string returned
            logger.error(f"Curation error for {request.filename}: {result}")
            raise HTTPException(status_code=500, detail=f"Curation failed: {result}")
            
    except Exception as e:
        logger.error(f"Exception during curation of {request.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")






if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)