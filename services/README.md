# ASCR Microservices Architecture

This directory contains the new microservices-based implementation of the ASCR system.

## Services

### 🎨 Frontend (`frontend/`)
- **Port**: 3000
- **Tech**: Next.js 15 + TypeScript
- **Purpose**: User interface for cell line management and curation

### 🤖 Curation Service (`curation_service/`)
- **Port**: 8001
- **Tech**: FastAPI + OpenAI
- **Purpose**: AI-powered curation of cell line data from text

### 📁 Cell Line Archive (`cell_line_archive/`)
- **Port**: 8002
- **Tech**: FastAPI + File Storage
- **Purpose**: CRUD operations for cell line data stored as JSON files

### ⚙️ Background Processor (`background_processor/`)
- **Tech**: Celery + Redis
- **Purpose**: Long-running tasks for AI curation processing

## Quick Start

1. **Copy environment file**:
   ```bash
   cp .env.new .env
   # Edit .env with your API keys
   ```

2. **Start services**:
   ```bash
   docker-compose -f docker-compose.new.yml up -d
   ```

3. **Access services**:
   - Frontend: http://localhost:3000
   - Curation API: http://localhost:8001/docs
   - Archive API: http://localhost:8002/docs

## API Endpoints

### Curation Service (8001)
- `POST /curate` - Start text curation job
- `GET /status/{job_id}` - Check job status
- `GET /jobs` - List recent jobs

### Archive Service (8002)
- `GET/POST /cell-lines/` - List/create cell lines
- `GET/PUT/DELETE /cell-lines/{id}` - Manage specific cell line
- `GET /cell-lines/{id}/versions` - Version history
- `GET /stats` - Archive statistics

## Data Storage

- **Cell Lines**: `/data/cell_lines/*.json`
- **Versions**: `/data/versions/{cell_line_id}/v*.json`
- **Curation Data**: `/curation_data/`

## Benefits vs Django Version

✅ **Simplified**:
- No database required
- No migrations
- File-based storage
- Microservices architecture

✅ **Maintained**:
- AI curation with OpenAI
- Background task processing
- Version control
- Frontend unchanged

✅ **Improved**:
- Service isolation
- Independent scaling
- Easier development
- Clear separation of concerns