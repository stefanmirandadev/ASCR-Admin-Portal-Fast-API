# ASCR Admin Portal - Microservices Architecture

The **Australian Stem Cell Registry (ASCR) Admin Portal** is a modern microservices-based web application for managing cell line data and AI-powered curation workflows. Built with FastAPI and Next.js, it provides a lightweight, scalable solution for cell line metadata management.

## 🏗️ Architecture

### Microservices Overview

```
┌─────────────┐    ┌──────────────────┐    ┌────────────────────┐
│  frontend   │◄───┤ curation_service │◄───┤ background_processor│
│  (Next.js)  │    │    (FastAPI)     │    │   (Celery+Redis)   │
└─────┬───────┘    └──────────────────┘    └────────────────────┘
      │                     
      ▼                     
┌─────────────────┐         
│cell_line_archive│         
│   (FastAPI)     │         
└─────────────────┘         
```

### Services

🎨 **Frontend** (`services/frontend/`)
- **Port**: 3001
- **Tech**: Next.js 15 + TypeScript + Tailwind CSS
- **Purpose**: User interface for cell line management and curation workflows

🤖 **Curation Service** (`services/curation_service/`)
- **Port**: 8001
- **Tech**: FastAPI + OpenAI
- **Purpose**: AI-powered extraction of cell line metadata from text

📁 **Cell Line Archive** (`services/cell_line_archive/`)
- **Port**: 8002
- **Tech**: FastAPI + File Storage
- **Purpose**: CRUD operations and version control for cell line data

⚙️ **Background Processor** (`services/background_processor/`)
- **Tech**: Celery + Redis
- **Purpose**: Long-running AI curation tasks and job processing

🔴 **Redis**
- **Port**: 6380
- **Purpose**: Task queue and caching for background jobs

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Text editor for configuration

### Get Started

1. **Clone and enter directory**
   ```bash
   git clone <repository-url>
   cd ascr-admin-portal
   ```

2. **Start all services**
   ```bash
   ./start.sh
   ```

3. **Configure API keys** (edit `.env` file)
   ```bash
   OPENAI_API_KEY=your_actual_openai_key
   ANTHROPIC_API_KEY=your_actual_anthropic_key
   ```

4. **Access the application**
   - **Frontend**: http://localhost:3001
   - **Curation API**: http://localhost:8001/docs
   - **Archive API**: http://localhost:8002/docs

## 📋 Features

- **🤖 AI-Powered Curation**: Extract cell line metadata from text using OpenAI GPT-4
- **📁 File-Based Storage**: Simple JSON file storage with automatic versioning
- **✏️ Advanced Editor**: Cell line editing with real-time diff visualization
- **🔄 Version Control**: Automatic versioning system (keeps last 10 versions)
- **⚡ Background Processing**: Asynchronous handling of long-running curation tasks
- **📊 Statistics**: Archive analytics and status tracking
- **🔍 Search & Filter**: Query cell lines by status, content, and metadata

## 🛠️ Development

### Local Development

**Start services:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f [service_name]
```

**Stop services:**
```bash
docker-compose down
```

### Project Structure

```
ascr-admin-portal/
├── services/
│   ├── frontend/              # Next.js application
│   ├── curation_service/      # AI curation FastAPI service
│   ├── cell_line_archive/     # Data management FastAPI service
│   └── background_processor/  # Celery worker for long tasks
├── sample_data/               # Example cell line data files
├── docker-compose.yml         # Service orchestration
├── start.sh                   # Quick start script
└── README.md                  # This file
```

### Data Storage

- **Cell Lines**: `/data/cell_lines/*.json` - Individual cell line records
- **Versions**: `/data/versions/{cell_line_id}/v*.json` - Version history
- **Jobs**: Redis-based temporary storage for curation job status

## 📡 API Endpoints

### Curation Service (Port 8001)
- `POST /curate` - Start AI curation job for text content
- `GET /status/{job_id}` - Check curation job status
- `GET /jobs` - List recent curation jobs
- `DELETE /jobs/{job_id}` - Remove completed job

### Archive Service (Port 8002)
- `GET /cell-lines/` - List all cell lines (with pagination/filtering)
- `POST /cell-lines/` - Create new cell line
- `GET /cell-lines/{id}` - Get specific cell line
- `PUT /cell-lines/{id}` - Update cell line
- `DELETE /cell-lines/{id}` - Archive cell line
- `GET /cell-lines/{id}/versions` - Get version history
- `GET /stats` - Archive statistics

## 🔧 Configuration

### Environment Variables

```bash
# Required for AI curation
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Service configuration
REDIS_URL=redis://redis:6379/0
DEBUG=true
```

### Volumes

- `archive_data` - Persistent storage for cell line data
- `curation_data` - Temporary storage for curation jobs
- `redis_data` - Redis persistence
- `frontend_node_modules` - Node.js dependencies cache

## 🧪 Sample Data

The `sample_data/` directory contains example cell line records that can be imported for testing:

```bash
# Example: Create a cell line from sample data
curl -X POST "http://localhost:8002/cell-lines/" \
  -H "Content-Type: application/json" \
  -d @sample_data/TEST001-A.json
```

## ⚡ Performance Features

- **File-based storage** - No database overhead
- **Microservices** - Independent scaling and deployment
- **Background processing** - Non-blocking AI operations
- **Containerized** - Consistent development and deployment
- **Version control** - Automatic cleanup (10-version retention)

## 🔒 Security Notes

- Configure proper API keys before production use
- Implement authentication for production deployments
- Review network security for container communication
- Backup data volumes regularly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns
4. Test your changes
5. Submit a pull request

## 📄 License

[Add your license information here]

---

**Simplified Architecture**: This microservices approach replaces the previous Django + PostgreSQL setup with a much lighter, more maintainable system focused on essential functionality.