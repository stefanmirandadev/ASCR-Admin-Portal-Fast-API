"""
Task Progress Manager for Redis-based progress tracking
"""
import redis
import json
import time
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import httpx
import logging

logger = logging.getLogger(__name__)


def _json_serializer(obj):
    """Custom JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


class TaskProgressManager:
    """Manages task progress tracking in Redis with detailed stage information"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.ttl = 7 * 24 * 60 * 60  # 7 days

    def create_task(self, task_id: str, filename: str, file_data: Optional[bytes] = None) -> None:
        """
        Create a new task in Redis with initial metadata

        Args:
            task_id: Unique task identifier
            filename: Name of the file being processed
            file_data: Optional file bytes for retry functionality
        """
        import base64

        task_data = {
            "task_id": task_id,
            "filename": filename,
            "status": "queued",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        # Store task metadata
        self.redis.setex(
            f"task:{task_id}",
            self.ttl,
            json.dumps(task_data)
        )

        # Store file data separately for retry (with shorter TTL to save memory)
        if file_data:
            file_data_b64 = base64.b64encode(file_data).decode('utf-8')
            self.redis.setex(
                f"task:{task_id}:file",
                2 * 24 * 60 * 60,  # 2 days TTL for file data
                file_data_b64
            )

        # Add to sorted set for listing (score = timestamp)
        self.redis.zadd(
            "tasks:all",
            {task_id: time.time()}
        )

        # Initialize empty stages list
        self.redis.setex(
            f"task:{task_id}:stages",
            self.ttl,
            json.dumps([])
        )

        logger.info(f"Created task {task_id} for file {filename}")

    def update_stage(self, task_id: str, stage: str, status: str,
                     message: str, data: Optional[Dict[str, Any]] = None) -> None:
        """
        Update or add a stage to the task's progress

        Args:
            task_id: Task identifier
            stage: Stage name (e.g., "uploading", "identifying", "curating")
            status: Stage status ("pending", "processing", "completed", "failed")
            message: Human-readable message
            data: Optional additional data (e.g., cell line names, counts)
        """
        # Get current stages
        stages_json = self.redis.get(f"task:{task_id}:stages")
        stages = json.loads(stages_json) if stages_json else []

        # Find existing stage or create new one
        stage_entry = None
        for s in stages:
            if s["stage"] == stage:
                stage_entry = s
                break

        if stage_entry is None:
            stage_entry = {
                "stage": stage,
                "status": status,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "data": data or {}
            }
            stages.append(stage_entry)
        else:
            # Update existing stage
            stage_entry["status"] = status
            stage_entry["message"] = message
            stage_entry["timestamp"] = datetime.now().isoformat()
            if data is not None:
                stage_entry["data"] = data

        # Save updated stages
        self.redis.setex(
            f"task:{task_id}:stages",
            self.ttl,
            json.dumps(stages)
        )

        # Update task metadata timestamp
        self._update_task_timestamp(task_id)

        # Broadcast update via WebSocket
        self._broadcast_progress_update(task_id, stage, status, message, data)

        logger.info(f"Task {task_id} - Stage '{stage}' updated to '{status}': {message}")

    def update_task_status(self, task_id: str, status: str,
                          error: Optional[str] = None,
                          result: Optional[Dict[str, Any]] = None) -> None:
        """
        Update the overall task status

        Args:
            task_id: Task identifier
            status: Task status ("queued", "processing", "completed", "failed")
            error: Error message if failed
            result: Final result data if completed
        """
        task_json = self.redis.get(f"task:{task_id}")
        if not task_json:
            logger.warning(f"Task {task_id} not found")
            return

        task_data = json.loads(task_json)
        task_data["status"] = status
        task_data["updated_at"] = datetime.now().isoformat()

        if error:
            task_data["error"] = error
        if result:
            task_data["result"] = result

        self.redis.setex(
            f"task:{task_id}",
            self.ttl,
            json.dumps(task_data, default=_json_serializer)
        )

        logger.info(f"Task {task_id} status updated to '{status}'")

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get task metadata and progress stages

        Args:
            task_id: Task identifier

        Returns:
            Task data with stages, or None if not found
        """
        task_json = self.redis.get(f"task:{task_id}")
        if not task_json:
            return None

        task_data = json.loads(task_json)

        # Get stages
        stages_json = self.redis.get(f"task:{task_id}:stages")
        task_data["stages"] = json.loads(stages_json) if stages_json else []

        return task_data

    def get_all_tasks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent tasks with their progress

        Args:
            limit: Maximum number of tasks to return

        Returns:
            List of task data dictionaries with stages
        """
        # Get recent task IDs from sorted set (most recent first)
        task_ids = self.redis.zrevrange("tasks:all", 0, limit - 1)

        tasks = []
        for task_id in task_ids:
            task_id_str = task_id.decode('utf-8') if isinstance(task_id, bytes) else task_id
            task_data = self.get_task(task_id_str)
            if task_data:
                tasks.append(task_data)

        return tasks

    def get_file_data(self, task_id: str) -> Optional[bytes]:
        """
        Get the original file data for a task (for retry)

        Args:
            task_id: Task identifier

        Returns:
            File bytes if available, None otherwise
        """
        import base64

        file_data_b64 = self.redis.get(f"task:{task_id}:file")
        if file_data_b64:
            if isinstance(file_data_b64, bytes):
                file_data_b64 = file_data_b64.decode('utf-8')
            return base64.b64decode(file_data_b64)
        return None

    def delete_task(self, task_id: str) -> bool:
        """
        Delete a task and all its associated data from Redis.

        Args:
            task_id: Task identifier

        Returns:
            True if task was deleted, False if task didn't exist
        """
        # Check if task exists
        task_json = self.redis.get(f"task:{task_id}")
        if not task_json:
            logger.warning(f"Task {task_id} not found for deletion")
            return False

        # Delete all task-related keys
        self.redis.delete(f"task:{task_id}")
        self.redis.delete(f"task:{task_id}:stages")
        self.redis.delete(f"task:{task_id}:file")

        # Remove from sorted set
        self.redis.zrem("tasks:all", task_id)

        logger.info(f"Deleted task {task_id} and all associated data")
        return True

    def _update_task_timestamp(self, task_id: str) -> None:
        """Update the task's updated_at timestamp"""
        task_json = self.redis.get(f"task:{task_id}")
        if task_json:
            task_data = json.loads(task_json)
            task_data["updated_at"] = datetime.now().isoformat()
            self.redis.setex(
                f"task:{task_id}",
                self.ttl,
                json.dumps(task_data)
            )

    def _broadcast_progress_update(self, task_id: str, stage: str, status: str,
                                   message: str, data: Optional[Dict[str, Any]]) -> None:
        """
        Broadcast progress update to WebSocket clients via FastAPI

        Args:
            task_id: Task identifier
            stage: Stage name
            status: Stage status
            message: Progress message
            data: Additional data
        """
        try:
            payload = {
                "type": "task_progress",
                "task_id": task_id,
                "stage": stage,
                "status": status,
                "message": message,
                "data": data or {},
                "timestamp": datetime.now().isoformat()
            }

            # Send to FastAPI WebSocket manager
            with httpx.Client(timeout=5.0) as client:
                response = client.post(
                    "http://backend:8001/internal/broadcast-task-progress",
                    json=payload
                )
                logger.debug(f"Broadcasted progress update for {task_id}: {response.status_code}")
        except Exception as e:
            logger.warning(f"Failed to broadcast progress update: {e}")
