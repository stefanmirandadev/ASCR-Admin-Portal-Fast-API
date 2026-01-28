# Task History Feature Specification

## Overview

The Task History feature provides persistent, real-time tracking of AI curation tasks with detailed stage-by-stage progress visualization. It maintains a Redis-backed history of all curation jobs, allowing users to monitor active tasks, review completed work, and retry failed operations without re-uploading files.

## Functional Description

### Purpose
- Provide real-time visibility into background AI curation task progress
- Persist task history across page refreshes and browser sessions
- Enable users to track multiple concurrent curation jobs
- Support retry functionality for failed tasks without file re-upload
- Display granular stage-by-stage progress for debugging and monitoring

### Key Features
1. **Persistent Task History**: Tasks stored in Redis with 7-day retention
2. **Real-time Progress Updates**: WebSocket-based live stage updates
3. **Detailed Stage Tracking**: 8 distinct stages from upload to completion
4. **Per-Cell-Line Progress**: Individual completion indicators for each cell line
5. **Expandable Details**: Collapsible stage view for each task
6. **Retry Mechanism**: One-click retry for failed tasks (2-day file retention)
7. **Status Visualization**: Color-coded icons and progress bars
8. **Cross-Session Persistence**: History survives page refreshes

### User Workflows

#### Starting a New Curation Task
1. User uploads PDF file(s) to Upload Sources card
2. User clicks "Start AI Curation"
3. Tasks immediately appear in Task History as "Queued"
4. Real-time progress updates show each stage:
   - Uploading file to OpenAI
   - Initializing AI agents
   - Identifying cell lines (shows found cell line names)
   - Curating each cell line (individual progress indicators)
   - Normalizing metadata
   - Validating data
   - Saving files
   - Task complete
5. Completion indicator (green checkmark) appears on success
6. Cell line files appear in Cell Lines list

#### Monitoring Active Tasks
1. User navigates to Curation page
2. Task History loads from Redis automatically
3. Active tasks show animated progress bar
4. User clicks expand arrow to view detailed stages
5. Per-cell-line progress visible in expanded view
6. Failed stages show error icon with message

#### Retrying a Failed Task
1. User identifies failed task (red error icon)
2. User clicks retry button (refresh icon)
3. New task queued with original file
4. Original file data retrieved from Redis cache
5. New task appears at top of history
6. Progress tracking begins immediately

## Architecture

### System Components

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │  HTTP   │                  │  Redis  │                 │
│  Next.js        │◄────────┤  FastAPI         │◄────────┤  Redis          │
│  Frontend       │  WS     │  Backend         │         │  (Task Store)   │
│                 │────────►│                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     │ Celery
                                     ▼
                            ┌──────────────────┐
                            │                  │
                            │  Celery Worker   │
                            │  (Background)    │
                            │                  │
                            └──────────────────┘
```

### Data Flow

1. **Task Creation**:
   - Frontend → Backend: POST /start-ai-curation
   - Backend → Redis: Create task metadata + file data
   - Backend → Celery: Queue curation job
   - Backend → Frontend: Return task IDs

2. **Progress Updates**:
   - Worker → TaskProgressManager: Update stage
   - TaskProgressManager → Redis: Store stage data
   - TaskProgressManager → Backend: HTTP progress broadcast
   - Backend → Frontend: WebSocket progress message
   - Frontend: Update UI in real-time

3. **Task Completion**:
   - Worker → TaskProgressManager: Mark complete
   - TaskProgressManager → Redis: Update status
   - TaskProgressManager → Backend: HTTP completion broadcast
   - Backend → Frontend: WebSocket completion message
   - Frontend: Show completion indicator

4. **History Retrieval**:
   - Frontend → Backend: GET /tasks
   - Backend → Redis: Query task metadata + stages
   - Backend → Frontend: Return task history
   - Frontend: Render task list

### Frontend Components

**Location**: `services/frontend/my-app/src/app/tools/curation/page.tsx`

**Key Components**:

1. **TaskProgressBar**
   - Displays individual task with status icon
   - Expandable/collapsible stage details
   - Retry button for failed tasks
   - Animated progress bar
   - Completion checkmark

2. **StageItem**
   - Renders individual stage progress
   - Shows stage status icon and message
   - Displays per-cell-line sub-stages
   - Color-coded status indicators

**State Management**:
```typescript
const [activeTasks, setActiveTasks] = useState<Array<{
  task_id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stages?: any[];
  created_at?: string;
  updated_at?: string;
  result?: any;
}>>([]);
```

**WebSocket Handler**:
- Connects to `ws://backend:8001/ws/task-updates`
- Handles two message types:
  - `task_progress`: Stage-level updates
  - `task_completed`: Final completion notification
- Merges updates with existing task state

### Backend Modules

#### TaskProgressManager
**Location**: `services/backend/task_progress.py`

**Class**: `TaskProgressManager`

**Purpose**: Central manager for task progress tracking and storage

**Key Methods**:

| Method | Purpose | Redis Operations |
|--------|---------|------------------|
| `create_task(task_id, filename, file_data)` | Initialize new task | SET task:{id}, SET task:{id}:file, ZADD tasks:all, SET task:{id}:stages |
| `update_stage(task_id, stage, status, message, data)` | Update stage progress | GET/SET task:{id}:stages, HTTP broadcast |
| `update_task_status(task_id, status, error, result)` | Update overall status | GET/SET task:{id} |
| `get_task(task_id)` | Retrieve task with stages | GET task:{id}, GET task:{id}:stages |
| `get_all_tasks(limit)` | Get recent task history | ZREVRANGE tasks:all, multiple GETs |
| `get_file_data(task_id)` | Get original file for retry | GET task:{id}:file |

**Redis Keys**:
- `task:{task_id}` - Task metadata (7-day TTL)
- `task:{task_id}:stages` - Progress stages array (7-day TTL)
- `task:{task_id}:file` - Original file base64 (2-day TTL)
- `tasks:all` - Sorted set of task IDs by timestamp

#### Celery Worker Integration
**Location**: `services/backend/tasks.py`

**Function**: `curate_article_task(filename, file_data)`

**Progress Broadcasting Points**:
```python
# Stage 1: Upload
progress.update_stage(task_id, "uploading", "processing", "Uploading file to OpenAI...")
# ... upload logic ...
progress.update_stage(task_id, "uploading", "completed", "File uploaded successfully")

# Stage 2: Initialize agents
progress.update_stage(task_id, "initializing", "processing", "Initializing AI agents...")
# ... init logic ...
progress.update_stage(task_id, "initializing", "completed", "Agents initialized")

# Stage 3: Identify cell lines
progress.update_stage(task_id, "identifying", "processing", "Identifying cell lines...")
# ... identification logic ...
progress.update_stage(
    task_id, "identifying", "completed",
    f"Found {len(cell_lines)} cell lines",
    {"cell_lines": cell_lines}
)

# Stage 4: Curate (with per-cell-line tracking)
progress.update_stage(
    task_id, "curating", "processing",
    f"Curating {len(cell_lines)} cell lines...",
    {"cell_lines": [{"name": cl, "status": "pending"} for cl in cell_lines]}
)
# ... curation logic ...
progress.update_stage(
    task_id, "curating", "completed",
    "All cell lines curated",
    {"cell_lines": [{"name": cl, "status": "completed"} for cl in cell_lines]}
)

# Stages 5-8: Normalize, Validate, Save, Complete
```

## API Endpoints

### GET /tasks
**Service**: Backend (Port 8001)
**File**: `services/backend/main.py`

**Purpose**: Retrieve recent task history with detailed progress stages

**Query Parameters**:
- `limit` (optional, default: 50): Maximum number of tasks to return

**Request**:
```bash
GET http://localhost:8001/tasks?limit=50
```

**Response**:
```json
{
  "tasks": [
    {
      "task_id": "66a07be2-34cc-4c06-bcb0-4c6084557a65",
      "filename": "34543885.pdf",
      "status": "completed",
      "created_at": "2026-01-28T21:45:44.000Z",
      "updated_at": "2026-01-28T21:46:15.000Z",
      "stages": [
        {
          "stage": "uploading",
          "status": "completed",
          "message": "File uploaded successfully",
          "timestamp": "2026-01-28T21:45:48.000Z",
          "data": {}
        },
        {
          "stage": "identifying",
          "status": "completed",
          "message": "Found 2 cell lines",
          "timestamp": "2026-01-28T21:45:53.000Z",
          "data": {
            "cell_lines": ["MCRIi019-A-1", "MCRIi019-A-2"]
          }
        },
        {
          "stage": "curating",
          "status": "completed",
          "message": "All cell lines curated",
          "timestamp": "2026-01-28T21:46:10.000Z",
          "data": {
            "cell_lines": [
              {"name": "MCRIi019-A-1", "status": "completed"},
              {"name": "MCRIi019-A-2", "status": "completed"}
            ]
          }
        }
      ]
    }
  ],
  "count": 1
}
```

**Response Fields**:
- `task_id`: Unique Celery task identifier
- `filename`: Original PDF filename
- `status`: Overall task status (queued/processing/completed/failed)
- `created_at`: Task creation timestamp (ISO 8601)
- `updated_at`: Last update timestamp (ISO 8601)
- `stages`: Array of stage objects with detailed progress
- `result`: Final curation result (only on completion)
- `error`: Error message (only on failure)

**Error Responses**:
- `500`: Failed to retrieve task history

### POST /tasks/{task_id}/retry
**Service**: Backend (Port 8001)
**File**: `services/backend/main.py`

**Purpose**: Retry a failed task using cached file data

**Path Parameters**:
- `task_id`: ID of task to retry

**Request**:
```bash
POST http://localhost:8001/tasks/66a07be2-34cc-4c06-bcb0-4c6084557a65/retry
```

**Response**:
```json
{
  "status": "queued",
  "original_task_id": "66a07be2-34cc-4c06-bcb0-4c6084557a65",
  "new_task_id": "8f3c2d91-45ab-4e22-9bc1-7d5e8a9f0c12",
  "filename": "34543885.pdf",
  "message": "Task queued for retry"
}
```

**Error Responses**:
- `404`: Task not found in Redis
- `410`: Original file data expired (>2 days old)
- `500`: Failed to queue retry task

### POST /internal/broadcast-task-progress
**Service**: Backend (Port 8001)
**File**: `services/backend/main.py`

**Purpose**: Internal endpoint for Celery worker to broadcast progress updates

**Authentication**: Internal only (not exposed externally)

**Request**:
```json
{
  "type": "task_progress",
  "task_id": "66a07be2-34cc-4c06-bcb0-4c6084557a65",
  "stage": "curating",
  "status": "processing",
  "message": "Curating MCRIi019-A-1 (1/2)",
  "data": {
    "cell_lines": [
      {"name": "MCRIi019-A-1", "status": "processing"},
      {"name": "MCRIi019-A-2", "status": "pending"}
    ]
  },
  "timestamp": "2026-01-28T21:46:05.000Z"
}
```

**Response**:
```json
{
  "status": "broadcasted"
}
```

### WebSocket: /ws/task-updates
**Service**: Backend (Port 8001)
**File**: `services/backend/main.py`

**Purpose**: Real-time task progress and completion notifications

**Connection**:
```javascript
const ws = new WebSocket('ws://localhost:8001/ws/task-updates');
```

**Message Types**:

1. **Progress Update**:
```json
{
  "type": "task_progress",
  "task_id": "66a07be2-34cc-4c06-bcb0-4c6084557a65",
  "stage": "identifying",
  "status": "completed",
  "message": "Found 2 cell lines",
  "data": {
    "cell_lines": ["MCRIi019-A-1", "MCRIi019-A-2"]
  },
  "timestamp": "2026-01-28T21:45:53.000Z"
}
```

2. **Task Completion** (legacy):
```json
{
  "type": "task_completed",
  "task_id": "66a07be2-34cc-4c06-bcb0-4c6084557a65",
  "filename": "34543885.pdf",
  "result": {
    "status": "success",
    "cell_lines_found": 2,
    "successful_validations": 2
  },
  "timestamp": "2026-01-28T21:46:15.000Z"
}
```

## Data Structures

### Task Metadata (Redis: task:{id})
```json
{
  "task_id": "66a07be2-34cc-4c06-bcb0-4c6084557a65",
  "filename": "34543885.pdf",
  "status": "processing",
  "created_at": "2026-01-28T21:45:44.000Z",
  "updated_at": "2026-01-28T21:46:10.000Z",
  "result": null,
  "error": null
}
```

### Stage Array (Redis: task:{id}:stages)
```json
[
  {
    "stage": "uploading",
    "status": "completed",
    "message": "File uploaded successfully",
    "timestamp": "2026-01-28T21:45:48.000Z",
    "data": {}
  },
  {
    "stage": "curating",
    "status": "processing",
    "message": "Curating cell lines...",
    "timestamp": "2026-01-28T21:46:05.000Z",
    "data": {
      "cell_lines": [
        {"name": "MCRIi019-A-1", "status": "completed"},
        {"name": "MCRIi019-A-2", "status": "processing"}
      ]
    }
  }
]
```

### Stage Status Values
- `pending`: Stage not yet started
- `processing`: Stage in progress
- `completed`: Stage finished successfully
- `failed`: Stage encountered error

### Task Status Values
- `queued`: Task created but not yet started
- `processing`: Task actively running
- `completed`: Task finished successfully
- `failed`: Task encountered fatal error

## Key Modules & Files

### Frontend
| File | Purpose | Lines of Code |
|------|---------|---------------|
| `services/frontend/my-app/src/app/tools/curation/page.tsx` | Main curation page with Task History card | ~960 |
| Lines 35-94 | StageItem component - individual stage rendering | 60 |
| Lines 96-195 | TaskProgressBar component - task list item with expand/collapse | 100 |
| Lines 281-285 | fetchTaskHistory - load history on mount | 5 |
| Lines 295-370 | WebSocket handler - real-time updates | 75 |
| Lines 373-405 | updateTaskStages - merge stage updates | 32 |
| Lines 407-430 | retryTask - retry failed tasks | 24 |

### Backend
| File | Purpose | Lines of Code |
|------|---------|---------------|
| `services/backend/task_progress.py` | TaskProgressManager class | ~250 |
| `services/backend/tasks.py` | Celery task with progress tracking | ~400 |
| `services/backend/main.py` | Task history API endpoints | ~50 |
| `services/backend/utils.py` | WebSocket broadcast utilities | ~30 |

### Integration Points
- **Curation Worker**: Calls `TaskProgressManager` at each stage
- **WebSocket Manager**: Broadcasts progress to connected clients
- **Redis**: Stores all task metadata and progress stages
- **Frontend State**: Merges WebSocket updates with fetched history

## Technical Specifications

### Redis Storage

**Memory Usage per Task**:
- Task metadata: ~500 bytes
- Stages array: ~2KB (8 stages with data)
- File data (base64): ~1.5MB average PDF
- **Total**: ~1.5MB per task

**TTL Configuration**:
- Task metadata: 7 days (604,800 seconds)
- Stage data: 7 days (604,800 seconds)
- File data: 2 days (172,800 seconds) - for retry functionality

**Capacity Estimation**:
- Redis memory: 512MB recommended
- Max tasks with file data: ~340 tasks
- Max tasks without file data: ~250,000 tasks

### Performance Characteristics

**Task Creation**:
- Redis operations: 4 (SET task, SET stages, SET file, ZADD list)
- Time: <10ms
- Network: 3 HTTP calls (queue, create, broadcast)

**Progress Update**:
- Redis operations: 2 (GET stages, SET stages)
- Time: <5ms
- WebSocket broadcast: <1ms to all clients
- Frontend update: <16ms (single frame)

**History Fetch**:
- Redis operations: 1 + N (ZREVRANGE + N GETs)
- Time: ~50ms for 50 tasks
- Payload size: ~100KB for 50 tasks (without file data)

**Retry Operation**:
- Redis operations: 2 (GET task, GET file)
- Time: ~100ms (includes file decode)
- File size: Up to 10MB supported

### WebSocket Protocol

**Connection Lifecycle**:
1. Client connects to `ws://backend:8001/ws/task-updates`
2. Server accepts and adds to active connections list
3. Server broadcasts task updates to all connected clients
4. Client processes updates and updates UI
5. Connection maintained with periodic pings
6. Server removes client on disconnect

**Message Flow**:
```
Worker → HTTP → Backend → WebSocket → Frontend
                 (internal)  (ws://)
```

**Scalability**:
- Current: Single backend instance, in-memory connection list
- Limit: ~1000 concurrent WebSocket connections
- Future: Redis pub/sub for multi-instance support

## Stage Definitions

### Stage 1: Uploading
- **Name**: `uploading`
- **Duration**: 1-5 seconds
- **Purpose**: Upload PDF to OpenAI Files API
- **Success Criteria**: File ID returned from OpenAI
- **Error Conditions**: Network timeout, invalid file, API key error

### Stage 2: Initializing
- **Name**: `initializing`
- **Duration**: 1-2 seconds
- **Purpose**: Initialize three AI agents (identification, curation, normalization)
- **Success Criteria**: All agents ready with loaded prompts
- **Error Conditions**: Prompt file missing, agent initialization failure

### Stage 3: Identifying
- **Name**: `identifying`
- **Duration**: 5-15 seconds
- **Purpose**: Extract cell line IDs from PDF
- **Success Criteria**: At least one cell line identified
- **Data**: List of cell line names found
- **Error Conditions**: No cell lines found, AI service timeout

### Stage 4: Curating
- **Name**: `curating`
- **Duration**: 10-60 seconds per cell line
- **Purpose**: Extract detailed metadata for each cell line
- **Success Criteria**: Metadata extracted for all identified cell lines
- **Sub-Stages**: Per-cell-line progress with individual status
- **Data**: Cell line array with completion status
- **Error Conditions**: AI extraction failure, timeout

### Stage 5: Normalizing
- **Name**: `normalizing`
- **Duration**: 5-20 seconds
- **Purpose**: Normalize metadata to controlled vocabularies
- **Success Criteria**: All cell lines normalized
- **Error Conditions**: Normalization agent failure

### Stage 6: Validating
- **Name**: `validating`
- **Duration**: 1-5 seconds
- **Purpose**: Validate against Pydantic schema
- **Success Criteria**: All cell lines pass validation
- **Error Conditions**: Schema validation errors

### Stage 7: Saving
- **Name**: `saving`
- **Duration**: 1-3 seconds
- **Purpose**: Save cell line JSON files to working directory
- **Success Criteria**: Files created successfully
- **Data**: List of saved files with status
- **Error Conditions**: File write error, disk full

### Stage 8: Complete
- **Name**: `complete`
- **Duration**: Instant
- **Purpose**: Mark task as successfully completed
- **Success Criteria**: All stages passed
- **Final Status**: `completed`

## Extension Guide

### Adding a New Progress Stage

**1. Update Celery Task** (`tasks.py`):
```python
# Add stage update before your new step
progress.update_stage(
    task_id,
    "new_stage_name",
    "processing",
    "User-friendly message",
    {"optional": "data"}
)

# ... your stage logic ...

# Mark complete
progress.update_stage(
    task_id,
    "new_stage_name",
    "completed",
    "Stage completed successfully"
)
```

**2. Update Frontend Display** (`page.tsx`):
- No changes needed - stages render automatically
- Optional: Add custom icon/styling in `StageItem` component

**3. Update Documentation**:
- Add stage definition to this spec
- Update stage count (currently 8 stages)

### Adding Retry Logic for Specific Stages

**Current**: Retry re-runs entire task from beginning

**To Add Stage-Specific Retry**:

1. Store stage checkpoint data in Redis
2. Add `start_from_stage` parameter to task
3. Modify task to skip completed stages
4. Update retry endpoint to accept stage parameter

### Adding Task Filtering

**Backend** (`main.py`):
```python
@app.get("/tasks")
async def get_task_history(
    limit: int = 50,
    status: str = None  # Filter by status
):
    progress_manager = TaskProgressManager(redis_client)
    tasks = progress_manager.get_all_tasks(limit)

    if status:
        tasks = [t for t in tasks if t["status"] == status]

    return {"tasks": tasks, "count": len(tasks)}
```

**Frontend** (`page.tsx`):
- Add filter UI (dropdown or chips)
- Call API with filter parameter
- Update displayed tasks

### Adding Task Cancellation

**Backend**:
1. Add `POST /tasks/{task_id}/cancel` endpoint
2. Use Celery's `app.control.revoke(task_id, terminate=True)`
3. Update Redis task status to `cancelled`

**Frontend**:
- Add cancel button to `TaskProgressBar`
- Call cancel endpoint
- Update UI to show cancelled status

## Testing

### Manual Testing

**Scenario 1: Normal Task Completion**
1. Start services: `docker-compose up -d`
2. Navigate to `http://localhost:3001/tools/curation`
3. Upload a PDF file
4. Click "Start AI Curation"
5. Verify task appears in Task History immediately
6. Click expand arrow to view stages
7. Watch real-time stage updates
8. Verify all 8 stages complete successfully
9. Verify green checkmark appears
10. Verify cell line appears in Cell Lines list

**Scenario 2: Page Refresh Persistence**
1. Start a curation task
2. Refresh browser while task is processing
3. Verify task history loads from Redis
4. Verify progress continues to update
5. Verify active task shows correct current stage

**Scenario 3: Task Retry**
1. Start a task that will fail (e.g., invalid API key)
2. Wait for task to fail (red error icon)
3. Click retry button (refresh icon)
4. Verify new task appears at top
5. Verify new task processes successfully (if error fixed)

**Scenario 4: Multiple Concurrent Tasks**
1. Upload 3 PDF files
2. Click "Start AI Curation"
3. Verify all 3 tasks appear in history
4. Verify all tasks update independently
5. Verify tasks complete in order

### Validation Points

**UI Elements**:
- [ ] Task list displays all tasks
- [ ] Expand/collapse arrows work
- [ ] Stage details render correctly
- [ ] Per-cell-line progress shows
- [ ] Retry button appears for failed tasks only
- [ ] Completion checkmark appears for successful tasks
- [ ] Progress bars animate during processing
- [ ] Status icons color-coded correctly

**Functionality**:
- [ ] Tasks persist across page refresh
- [ ] WebSocket reconnects after connection loss
- [ ] Real-time updates appear instantly
- [ ] Retry queues new task with same file
- [ ] Failed tasks show error details
- [ ] Completed tasks show final result

**Data Integrity**:
- [ ] Redis stores all task metadata
- [ ] Stage updates stored correctly
- [ ] File data available for retry
- [ ] TTL cleanup works after 7 days
- [ ] Sorted set maintains correct order

### API Testing

```bash
# Get task history
curl http://localhost:8001/tasks?limit=10

# Retry a failed task
curl -X POST http://localhost:8001/tasks/{task_id}/retry

# Check WebSocket connection (using wscat)
wscat -c ws://localhost:8001/ws/task-updates

# Monitor Redis data
docker exec -it ascr-admin-portal-fast-api-redis-1 redis-cli
> KEYS task:*
> GET task:{task_id}
> GET task:{task_id}:stages
> ZRANGE tasks:all 0 -1 WITHSCORES
```

### Performance Testing

**Load Test**:
```bash
# Start 10 concurrent curation tasks
for i in {1..10}; do
  curl -X POST http://localhost:8001/start-ai-curation \
    -H "Content-Type: application/json" \
    -d @test_payload.json &
done

# Monitor task creation rate
# Expected: <100ms per task creation

# Monitor Redis memory
docker stats ascr-admin-portal-fast-api-redis-1
# Expected: <50MB for 10 tasks with files
```

**WebSocket Scalability**:
```bash
# Connect 100 WebSocket clients
# Use tool like artillery or custom script
# Expected: All clients receive updates
# Expected: Broadcast latency <10ms
```

## Future Enhancements

### Planned Features

1. **Task Filtering and Search**
   - Filter by status (completed/failed/processing)
   - Search by filename
   - Date range filtering
   - Cell line name search

2. **Batch Operations**
   - Select multiple failed tasks
   - Bulk retry operation
   - Bulk delete from history

3. **Enhanced Retry**
   - Retry from specific stage (not full restart)
   - Automatic retry on transient failures
   - Retry with different settings

4. **Export Capabilities**
   - Export task history as CSV
   - Export stage details for debugging
   - Download task results as JSON

5. **Task Analytics**
   - Success/failure rate dashboard
   - Average processing time per stage
   - Most common failure points
   - Cell line extraction statistics

6. **Notifications**
   - Browser notifications on completion
   - Email notifications for long-running tasks
   - Slack/webhook integration

7. **Task Prioritization**
   - Priority queue for urgent tasks
   - Pause/resume functionality
   - Task dependencies

### Consideration for Scale

**Multi-Instance Deployment**:
- Replace in-memory WebSocket list with Redis pub/sub
- Implement sticky sessions or connection broadcast
- Shared Redis instance across backend replicas

**Large File Handling**:
- Move file storage from Redis to S3/MinIO
- Store only file reference in Redis
- Implement streaming for large PDFs

**Long-Term Storage**:
- Archive old tasks to PostgreSQL/MongoDB
- Keep only recent tasks (30 days) in Redis
- Implement task history pagination

**Monitoring & Observability**:
- Prometheus metrics for task rates
- Grafana dashboards for visualization
- Distributed tracing (OpenTelemetry)
- Error tracking (Sentry integration)
