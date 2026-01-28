from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging
import utils
from storage import StorageInterface, FileStorage
from version_control import VersionControl
from data_transport import DataTransport
from models import StartAICurationRequest, TaskCompletionNotification
from data_dictionaries.curation_models import CellLineCurationForm
from tasks import curate_article_task, redis_client
from config_manager import config_manager
from task_progress import TaskProgressManager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dependency injection functions
def get_storage() -> StorageInterface:
    """
    Dependency injection for storage interface.
    This is the ONLY place where we specify which storage implementation to use.
    To switch to S3, just change this function!
    """
    return FileStorage()

def get_version_control(storage: StorageInterface = Depends(get_storage)) -> VersionControl:
    """
    Dependency injection for version control.
    Pure versioning logic with no file operations.
    """
    return VersionControl(storage)

def get_data_transport(
    storage: StorageInterface = Depends(get_storage),
    version_control: VersionControl = Depends(get_version_control)
) -> DataTransport:
    """
    Dependency injection for data transport.
    Orchestrates storage and version control for complex workflows.
    """
    return DataTransport(storage, version_control)

app = FastAPI(title="ASCR Curation Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001",
                   "http://172.26.129.138:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints
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
        return utils.get_frontend_schema(CellLineCurationForm)
    except Exception as e:
        logger.error(f"Error generating schema: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schema generation failed: {str(e)}")

@app.get("/get-empty-form")
async def get_empty_cellline_form(hpscreg_name: str = ""):
    """
    Return an empty form structure based on CellLineCurationForm model.
    Each section has one instance with placeholder values ("..." for strings).
    """
    try:
        return utils.generate_empty_form(CellLineCurationForm, hpscreg_name)
    except Exception as e:
        logger.error(f"Error generating empty form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Empty form generation failed: {str(e)}")


@app.post("/start-ai-curation")
async def start_ai_curation(request: StartAICurationRequest):
    """
    Queue AI curation tasks for one or more uploaded articles.
    Each file is dispatched to an independent Celery task.
    """
    try:
        # Check if API key is configured
        api_key = config_manager.get("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="OpenAI API key not configured. Please set it in Settings before starting curation."
            )

        # Convert Pydantic request to dict format for utils function
        files = [{"filename": f.filename, "file_data": f.file_data} for f in request.files]
        return utils.queue_curation_tasks(files, curate_article_task) # Starts Celery curation tasks
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error queuing curation tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats(storage: StorageInterface = Depends(get_storage)):
    """
    Get statistics about cell lines across all directories.
    Returns counts for total, working, queued, and ready cell lines.
    """
    try:
        working_files = storage.list_files("working")
        ready_files = storage.list_files("ready")

        # For now, queued is 0 (can be updated when queue system is added)
        queued_count = 0

        return {
            "total_cell_lines": len(working_files) + len(ready_files),
            "working_count": len(working_files),
            "queued_count": queued_count,
            "registered_count": len(ready_files)
        }
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@app.get("/get-all-cell-lines")
async def get_all_cell_lines(storage: StorageInterface = Depends(get_storage)):
    """
    Get list of all cell line names from both working and ready directories.
    Returns deduplicated list with location info for quick search.
    """
    try:
        working_files = storage.list_files("working")
        ready_files = storage.list_files("ready")

        # Build list with location info
        all_cell_lines = []
        seen = set()

        for filename in working_files:
            if filename not in seen:
                all_cell_lines.append({"name": filename, "location": "working"})
                seen.add(filename)

        for filename in ready_files:
            if filename not in seen:
                all_cell_lines.append({"name": filename, "location": "ready"})
                seen.add(filename)

        return {"cell_lines": all_cell_lines}
    except Exception as e:
        logger.error(f"Error getting all cell lines: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get all cell lines: {str(e)}")

@app.get("/working/files")
async def get_working_files(storage: StorageInterface = Depends(get_storage)):
    """
    Get list of cell line files in the working directory.
    """
    try:
        return {"files": storage.list_files("working")}
    except Exception as e:
        logger.error(f"Error getting working files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get working files: {str(e)}")

@app.get("/ready/files") 
async def get_ready_files(storage: StorageInterface = Depends(get_storage)):
    """
    Get list of cell line files in the ready directory.
    """
    try:
        return {"files": storage.list_files("ready")}
    except Exception as e:
        logger.error(f"Error getting ready files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get ready files: {str(e)}")

@app.get("/cell-line/{filename}")
async def get_cell_line(filename: str, storage: StorageInterface = Depends(get_storage)):
    """
    Retrieve a specific cell line JSON file by filename.
    """
    try:
        # Try working directory first, then ready
        result = storage.get(filename, "working")
        if result is None:
            result = storage.get(filename, "ready")
        if result is None:
            raise HTTPException(status_code=404, detail=f"Cell line file '{filename}' not found in working or ready directories")
        return result
    except Exception as e:
        logger.error(f"Error getting cell line {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get cell line: {str(e)}")

@app.post("/cell-line/{filename}/move-to-ready")
async def move_cell_line_to_ready(filename: str, data_transport: DataTransport = Depends(get_data_transport)):
    """
    Move a cell line file from working to ready directory with automatic versioning.
    Creates versioned files like TestCell001_v0, TestCell001_v1, etc.
    """
    try:
        return data_transport.move_to_ready_with_versioning(filename)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error moving {filename} to ready with versioning: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to move file with versioning: {str(e)}")

@app.post("/cell-line/{filename}/move-to-working")
async def move_cell_line_to_working(filename: str, data_transport: DataTransport = Depends(get_data_transport)):
    """
    Move a cell line file from ready to working directory.
    """
    try:
        return data_transport.move_to_working(filename)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        # File already exists in destination - conflict error
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error moving {filename} to working: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to move file: {str(e)}")

@app.get("/cell-line/{base_name}/versions")
async def get_cell_line_versions(base_name: str, version_control: VersionControl = Depends(get_version_control)):
    """
    Get all versions for a given cell line base name.
    Returns versions from ready directory (e.g. TestCell001_v0, TestCell001_v1).
    """
    try:
        versions = version_control.get_all_versions(base_name)
        return {
            "base_name": base_name,
            "versions": versions,
            "count": len(versions)
        }
    except Exception as e:
        logger.error(f"Error getting versions for {base_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get versions: {str(e)}")

@app.get("/cell-line/{base_name}/latest")
async def get_latest_cell_line_version(base_name: str, version_control: VersionControl = Depends(get_version_control)):
    """
    Get the latest version of a cell line.
    Returns the highest version number with full cell line data.
    """
    try:
        return version_control.get_latest_version_data(base_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting latest version for {base_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get latest version: {str(e)}")

@app.post("/working/cell-line")
async def create_cell_line(cell_line_data: dict, storage: StorageInterface = Depends(get_storage)):
    """
    Create a new cell line file in the working directory.
    """
    try:
        # Extract filename from data - try cell_line first, then basic_data for legacy
        cell_line_list = cell_line_data.get("cell_line", []) or cell_line_data.get("basic_data", [])
        hpscreg_name = cell_line_list[0].get("hpscreg_name") if cell_line_list else None
        if not hpscreg_name:
            raise ValueError("Cannot save file without hpscreg_name in cell_line")
        
        return storage.create(hpscreg_name, cell_line_data, "working")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating cell line: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create cell line file: {str(e)}")

@app.put("/working/cell-line/{filename}")
async def update_cell_line(filename: str, cell_line_data: dict, storage: StorageInterface = Depends(get_storage)):
    """
    Update an existing cell line file in the working directory, or create if it doesn't exist.
    If hpscreg_name changes, the file is renamed to match the new name.
    """
    try:
        # Extract new hpscreg_name from data
        cell_line_list = cell_line_data.get("cell_line", []) or cell_line_data.get("basic_data", [])
        new_hpscreg_name = cell_line_list[0].get("hpscreg_name") if cell_line_list else None
        if not new_hpscreg_name:
            raise ValueError("Cannot save file without hpscreg_name in cell_line")

        # If hpscreg_name changed, delete old file and create with new name
        if new_hpscreg_name != filename:
            # Delete old file if it exists
            if storage.exists(filename, "working"):
                storage.delete(filename, "working")
            # Create/update with new filename
            return storage.update(new_hpscreg_name, cell_line_data, "working")

        return storage.update(filename, cell_line_data, "working")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating cell line {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update cell line file: {str(e)}")

@app.delete("/working/cell-line")
async def delete_cell_line(payload: dict, storage: StorageInterface = Depends(get_storage)):
    """
    Delete a cell line file from the working directory only.
    Requires payload: {"filename": "cell_line_name"}
    """
    try:
        # Validate payload contains filename
        if "filename" not in payload or not payload["filename"]:
            raise HTTPException(status_code=400, detail="Missing required field 'filename' in request payload")
        
        filename = payload["filename"]
        return storage.delete(filename, "working")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting cell line {payload.get('filename', 'unknown')}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete cell line file: {str(e)}")

@app.post("/internal/broadcast-task-completion")
async def broadcast_task_completion_endpoint(notification: TaskCompletionNotification):
    """Internal endpoint for Celery tasks to broadcast completion"""
    await utils.broadcast_task_completion(notification.model_dump())
    return {"status": "broadcasted"}


@app.post("/internal/broadcast-task-progress")
async def broadcast_task_progress_endpoint(progress_data: dict):
    """Internal endpoint for Celery tasks to broadcast progress updates"""
    await utils.broadcast_task_progress(progress_data)
    return {"status": "broadcasted"}


@app.get("/tasks")
async def get_task_history(limit: int = 50):
    """
    Get recent task history with detailed progress stages.
    Returns tasks sorted by most recent first.
    """
    try:
        progress_manager = TaskProgressManager(redis_client)
        tasks = progress_manager.get_all_tasks(limit)
        return {"tasks": tasks, "count": len(tasks)}
    except Exception as e:
        logger.error(f"Error getting task history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get task history: {str(e)}")


@app.post("/tasks/{task_id}/retry")
async def retry_task(task_id: str):
    """
    Retry a failed task by queueing it again with the original file data.
    """
    try:
        progress_manager = TaskProgressManager(redis_client)

        # Get original task info
        task = progress_manager.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        # Get original file data
        file_data = progress_manager.get_file_data(task_id)
        if not file_data:
            raise HTTPException(status_code=410, detail="Original file data no longer available. Please re-upload the file.")

        # Queue a new task with the original file
        filename = task["filename"]
        new_task = curate_article_task.apply_async(args=[filename, file_data])

        logger.info(f"Retrying task {task_id} as new task {new_task.id}")

        return {
            "status": "queued",
            "original_task_id": task_id,
            "new_task_id": new_task.id,
            "filename": filename,
            "message": "Task queued for retry"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retry task: {str(e)}")


@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """
    Delete a task from the task history.
    Removes the task and all associated data from Redis.
    """
    try:
        progress_manager = TaskProgressManager(redis_client)
        deleted = progress_manager.delete_task(task_id)

        if not deleted:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        return {
            "status": "success",
            "task_id": task_id,
            "message": "Task deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")

@app.get("/settings")
async def get_settings():
    """
    Get all user-configurable settings.
    API keys are masked for security.
    """
    try:
        settings = config_manager.get_all_settings()
        return {"settings": settings}
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get settings: {str(e)}")

@app.post("/settings")
async def update_settings(settings: dict):
    """
    Update application settings.
    Only updates non-empty values.
    """
    try:
        logger.info(f"Received settings update request: {list(settings.keys())}")
        config_manager.update_settings(settings)
        logger.info(f"Settings updated successfully. New config: {config_manager.get_all_settings()}")
        return {"status": "success", "message": "Settings updated successfully"}
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@app.websocket("/ws/task-updates")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time task completion updates"""
    await utils.websocket_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive by waiting for messages
            # Frontend can send ping/pong to maintain connection
            await websocket.receive_text()
    except WebSocketDisconnect:
        utils.websocket_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
