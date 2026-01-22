from typing import Dict, Any, List, Tuple, get_args, get_origin
from pydantic import BaseModel
from pydantic.fields import FieldInfo
from fastapi import WebSocket
import logging
import base64
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Helper functions for common operations


def get_frontend_schema(model_class: BaseModel) -> Dict[str, Any]:
    try:
        # Get the JSON schema from the Pydantic model
        schema = model_class.model_json_schema()
        
        # Transform to editor-compatible format
        editor_schema = {}
        properties = schema.get("properties", {})
        required_fields = schema.get("required", [])
        
        for prop_name, prop_def in properties.items():
            field_schema = {
                "type": "JSONField",  # Default for complex objects
                "required": prop_name in required_fields,
                "help_text": prop_def.get("description", "")
            }
            
            # Map Pydantic types to frontend field types
            if prop_def.get("type") == "string":
                field_schema["type"] = "CharField"
                if "maxLength" in prop_def:
                    field_schema["max_length"] = prop_def["maxLength"]
                if "enum" in prop_def:
                    field_schema["choices"] = prop_def["enum"]
            elif prop_def.get("type") == "integer":
                field_schema["type"] = "IntegerField"
            elif prop_def.get("type") == "boolean":
                field_schema["type"] = "BooleanField"
            elif prop_def.get("type") == "array":
                field_schema["type"] = "JSONField"
                field_schema["json_schema"] = prop_def
            
            editor_schema[prop_name] = field_schema
        
        return {
            "schema": {
                "fields": editor_schema
            },
            "model_name": model_class.__name__,
            "description": f"Schema for {model_class.__name__} model"
        }
        
    except Exception as e:
        logger.error(f"Error generating frontend schema for {model_class.__name__}: {str(e)}")
        raise Exception(f"Schema generation failed: {str(e)}")

def _create_placeholder_instance(model_class: type, overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """Create an instance of a Pydantic model with placeholder values."""
    overrides = overrides or {}
    instance_data = {}

    for field_name, field_info in model_class.model_fields.items():
        # Use override if provided
        if field_name in overrides:
            instance_data[field_name] = overrides[field_name]
            continue

        annotation = field_info.annotation

        # Handle Optional types - extract inner type
        origin = get_origin(annotation)
        if origin is type(None) or annotation is type(None):
            instance_data[field_name] = None
            continue

        # Check if it's Optional (Union with None)
        is_optional = False
        inner_type = annotation
        if hasattr(annotation, '__origin__'):
            args = get_args(annotation)
            if type(None) in args:
                is_optional = True
                inner_type = next((a for a in args if a is not type(None)), str)

        # Handle Literal types - use first option
        if hasattr(inner_type, '__origin__') and inner_type.__origin__ is type(None):
            instance_data[field_name] = None
        elif hasattr(inner_type, '__args__') and not hasattr(inner_type, '__origin__'):
            # This is a Literal type
            instance_data[field_name] = "..."
        elif inner_type == str or (hasattr(inner_type, '__origin__') and get_origin(inner_type) is None and inner_type == str):
            instance_data[field_name] = "..."
        elif inner_type == int:
            instance_data[field_name] = 0 if not is_optional else None
        elif inner_type == float:
            instance_data[field_name] = 0.0 if not is_optional else None
        elif inner_type == bool:
            instance_data[field_name] = False if not is_optional else None
        elif hasattr(inner_type, '__name__') and inner_type.__name__ in ('date', 'datetime'):
            instance_data[field_name] = None
        else:
            # Default to placeholder string for unknown types
            instance_data[field_name] = "..."

    return instance_data


def generate_empty_form(form_class: type, hpscreg_name: str = "") -> Dict[str, Any]:
    """Generate an empty form with placeholder values for all fields."""
    result = {}

    for field_name, field_info in form_class.model_fields.items():
        annotation = field_info.annotation

        # Get the inner type of List[ModelClass]
        if hasattr(annotation, '__origin__') and annotation.__origin__ is list:
            args = get_args(annotation)
            if args and hasattr(args[0], 'model_fields'):
                model_class = args[0]
                # Special handling for cell_line section
                overrides = {}
                if field_name == "cell_line" and hpscreg_name:
                    overrides["hpscreg_name"] = hpscreg_name

                result[field_name] = [_create_placeholder_instance(model_class, overrides)]
            else:
                result[field_name] = []
        else:
            result[field_name] = []

    return result


def queue_curation_tasks(files: List[Dict[str, str]], curate_task_func) -> Dict[str, Any]:
    if not files:
        raise ValueError("No files provided for curation.")
    
    tasks = []
    for uploaded_file in files:
        try:
            # Decode base64 file data to bytes
            pdf_bytes = base64.b64decode(uploaded_file["file_data"])
            
            # Queue Celery task
            task = curate_task_func.apply_async(args=[uploaded_file["filename"], pdf_bytes])
            
            tasks.append({
                "filename": uploaded_file["filename"],
                "task_id": task.id
            })
            
        except Exception as e:
            logger.error(f"Failed to queue curation for {uploaded_file['filename']}: {str(e)}")
            raise Exception(f"Failed to queue {uploaded_file['filename']}: {str(e)}")
    
    return {
        "status": "queued",
        "total_files": len(files),
        "tasks": tasks,
        "message": "Curation tasks queued; track progress via Celery backend."
    }

class ConnectionManager:
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if self.active_connections:
            logger.info(f"Broadcasting to {len(self.active_connections)} clients: {message}")
            for connection in self.active_connections.copy():
                try:
                    await connection.send_json(message)
                except:
                    # Remove dead connections
                    self.active_connections.remove(connection)

# Global connection manager instance
websocket_manager = ConnectionManager()

async def broadcast_task_completion(notification_data: Dict[str, Any]):
    await websocket_manager.broadcast({
        "type": notification_data["type"],
        "task_id": notification_data["task_id"],
        "filename": notification_data["filename"],
        "result": notification_data["result"],
        "timestamp": notification_data["timestamp"]
    })


# Note: The following functions have been moved/replaced:
# - Cell line CRUD operations: moved to datastore.py (CellLineDataStore class)
# - Cell line validation: moved to validation.py (CellLineValidation class)  
# - Cell line saving: moved to tasks.py (_save_cell_lines function using datastore)