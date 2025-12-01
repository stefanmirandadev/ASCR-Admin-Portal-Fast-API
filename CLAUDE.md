# CLAUDE.md

This file provides guidance to Claude Code when working with the ASCR Admin Portal microservices architecture.


## Claude Developer Mindset
This section of instructions suggests the mindset that I want you to have when developing with me.

### Code and commenting
- Propose only the minimally engineered version of what I asked for. **Don't over engineer**.
- If you think you have a good idea for how to extend what I ask for, first propose the minimally engineered version, then provide the suggestion in chat.
- When writing code always provide the minimally engineered solution first, based on my requirements.
- When writing comments in code, be concise and clear. Comment in terms of high-level architecture.

### Conversation
- When conversing with me, be concise and clear.
- Do not be verbose or long winded.
- However, when giving explanations, explain things clearly and naturally.



## MCP Connection

Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.

## Project Overview

The **Australian Stem Cell Registry (ASCR) Admin Portal** is a modern microservices-based web application for managing cell line data and AI-powered curation workflows. Built with FastAPI and Next.js, it provides a lightweight, scalable solution for cell line metadata management.

## Architecture

### Microservices Structure

- **Frontend** (`services/frontend/my-app/`) - Next.js 15 + TypeScript application (Port 3001)
- **Curation Service** (`services/curation_service/`) - FastAPI + OpenAI for AI curation (Port 8001)
- **Cell Line Archive** (`services/cell_line_archive/`) - FastAPI + file storage for data management (Port 8002)
- **Background Processor** (`services/background_processor/`) - Celery worker for long-running tasks
- **Redis** - Task queue and caching (Port 6380)

## Development Commands

### Quick Start
```bash
# Start all services
./start.sh

# Or manually
docker-compose up -d
```

### Service Management
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f [frontend|curation_service|cell_line_archive|background_processor|redis]

# Restart a service
docker-compose restart [service_name]

# Stop all services
docker-compose down
```

### Individual Service Development

#### Curation Service (Port 8001)
```bash
cd services/curation_service/
python -m uvicorn main:app --reload --port 8001
```

#### Archive Service (Port 8002)
```bash
cd services/cell_line_archive/
python -m uvicorn main:app --reload --port 8002
```

#### Frontend (Port 3001)
```bash
cd services/frontend/my-app/
npm run dev
```

#### Background Processor
```bash
cd services/background_processor/
celery -A worker worker --loglevel=info
```

## Data Storage

### File-Based Architecture
- **Cell Lines**: Stored as JSON files in `archive_data/cell_lines/`
- **Versions**: Version history in `archive_data/versions/{cell_line_id}/v*.json`
- **Jobs**: Temporary job status in Redis
- **Sample Data**: Example records in `sample_data/`

### Data Flow
1. **Manual Entry**: Create cell lines via Archive API
2. **AI Curation**: Submit text to Curation Service for OpenAI processing
3. **Background Processing**: Long-running curation jobs handled by Celery
4. **Version Control**: Automatic versioning on cell line updates (10-version retention)
5. **Frontend Interface**: User interaction through Next.js application

## API Integration

### Curation Service (8001)
- `POST /curate` - Start AI curation job
- `GET /status/{job_id}` - Check job status
- `GET /jobs` - List recent jobs

### Archive Service (8002)
- `GET/POST /cell-lines/` - List/create cell lines
- `GET/PUT/DELETE /cell-lines/{id}` - Manage specific cell line
- `GET /cell-lines/{id}/versions` - Version history
- `GET /stats` - Archive statistics

## Environment Configuration

Required environment variables:
```bash
# AI Services (required for curation)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Service configuration
REDIS_URL=redis://redis:6379/0
DEBUG=true
```

## Key Technologies

- **FastAPI**: Modern Python web framework for APIs
- **Next.js 15**: React framework with TypeScript
- **Pydantic**: Data validation and serialization
- **Celery**: Distributed task queue
- **Redis**: In-memory data store for task queue
- **Docker**: Containerization for consistent development

## Frontend Structure

```
services/frontend/my-app/src/app/
├── components/          # Shared UI components
├── tools/
│   ├── curation/       # AI curation interface
│   ├── editor/         # Cell line editor with diff visualization
│   ├── transcription/  # (Legacy - can be removed)
│   └── ontologies/     # Ontology management
└── lib/                # Utility functions and API clients
```

## Testing

### Backend Services
```bash
# Test curation service
curl http://localhost:8001/health

# Test archive service  
curl http://localhost:8002/health

# Create test cell line
curl -X POST "http://localhost:8002/cell-lines/" \
  -H "Content-Type: application/json" \
  -d '{"CellLine_hpscreg_id": "TEST001", "CellLine_cell_line_type": "hiPSC"}'
```

### Frontend
```bash
cd services/frontend/my-app/
npm test
```

## Performance Considerations

- **File Storage**: No database overhead, simple JSON persistence
- **Microservices**: Independent scaling and development
- **Background Tasks**: Non-blocking AI operations via Celery
- **Version Control**: Automatic cleanup prevents storage bloat
- **Container Volumes**: Persistent data storage across container restarts

## Development Workflow

1. **Start Services**: Use `./start.sh` for full stack development
2. **Service Development**: Individual services can be run locally for faster iteration
3. **API Testing**: Use FastAPI auto-generated docs at `/docs` endpoints
4. **Frontend Development**: Hot reload available via Next.js dev server
5. **Background Tasks**: Monitor Celery worker for long-running operations

## Important Notes

- **No Database**: This architecture uses file-based storage instead of PostgreSQL
- **No Transcription**: AWS Textract integration has been removed for simplicity
- **Simplified Models**: Pydantic models are used instead of Django ORM
- **Version Control**: File-based versioning with automatic cleanup
- **AI Integration**: OpenAI GPT-4 for cell line metadata extraction

## Migration from Django

This microservices architecture replaces the previous Django + PostgreSQL setup with:
- ✅ **Simpler**: File storage instead of database migrations
- ✅ **Faster**: Independent service development and deployment
- ✅ **Cleaner**: Focused microservices with clear responsibilities
- ✅ **Maintainable**: Reduced complexity and dependencies