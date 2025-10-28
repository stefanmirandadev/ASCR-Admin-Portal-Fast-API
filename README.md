# ASCR Admin Portal

The **Australian Stem Cell Registry (ASCR) Admin Portal** is a comprehensive web application for managing cell line data, article transcription, and AI-powered curation workflows. Built with Django REST Framework and Next.js, it provides tools for PDF document processing, cell line metadata extraction using AI, and comprehensive data management with version control.

## Features

- **📄 PDF Transcription**: Automated text extraction from research articles using AWS Textract
- **🤖 AI-Powered Curation**: Intelligent cell line metadata extraction using OpenAI GPT-4
- **✏️ Advanced Cell Line Editor**: Comprehensive editing interface with real-time diff visualization
- **🔄 Version Control**: Automatic versioning system for tracking cell line changes
- **🔍 Ontology Management**: Structured data management with controlled vocabularies
- **⚡ Real-time Updates**: Live status tracking for transcription and curation workflows
- **🚀 Performance Optimized**: Virtualized components for handling large datasets

## Tech Stack

### Backend
- **Django 5.0.2** - Web framework
- **Django REST Framework 3.14.0** - API development
- **PostgreSQL** - Primary database
- **Redis** - Caching and task queue
- **Celery** - Background task processing
- **AWS Textract** - PDF text extraction
- **OpenAI API** - AI-powered data curation

### Frontend
- **Next.js 15** - React framework with TypeScript
- **Tailwind CSS** - Styling framework
- **React 19** - UI library
- **Preline UI** - Component library
- **React Window** - Virtualization for performance
- **Lodash** - Utility functions

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Gunicorn** - WSGI server
- **Boto3** - AWS integration

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.9+ (for local backend development)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ascr-admin-portal
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** (edit `.env`):
   ```bash
   # Database
   DATABASE_URL=postgres://postgres:postgres@db:5432/postgres
   
   # Redis
   REDIS_URL=redis://redis:6379/0
   
   # AI Services
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   
   # AWS Services
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_DEFAULT_REGION=us-east-1
   
   # Django
   DJANGO_SECRET_KEY=your_secret_key
   DJANGO_DEBUG=True
   ```

### Running with Docker (Recommended)

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Run database migrations**
   ```bash
   docker-compose exec web python manage.py migrate
   ```

3. **Load sample cell line data**
   ```bash
   docker-compose exec web python manage.py load_celllines
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin

### Development Setup

#### Backend Development
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver

# Start Celery worker (separate terminal)
celery -A config worker -l INFO

# Start Celery beat scheduler (separate terminal)
celery -A config beat -l INFO
```

#### Frontend Development
```bash
cd api/front-end/my-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Project Structure

```
ascr-admin-portal/
├── api/                           # Django backend
│   ├── curation/                  # AI curation service
│   ├── editor/                    # Cell line editor API
│   ├── front-end/my-app/          # Next.js frontend
│   ├── ontologies/                # Ontology management
│   ├── transcription/             # PDF transcription service
│   ├── models.py                  # Core data models
│   └── views.py                   # API endpoints
├── config/                        # Django configuration
├── cell_line_templates/           # Sample cell line data
├── data_dictionary/               # Data validation and schemas
├── docker-compose.yml             # Container orchestration
├── requirements.txt               # Python dependencies
└── manage.py                      # Django management script
```

## Core Applications

### Transcription Service (`api/transcription/`)
- PDF upload and processing
- AWS Textract integration
- Text extraction and formatting
- Status tracking and error handling

### Curation Service (`api/curation/`)
- AI-powered metadata extraction
- OpenAI GPT-4 integration
- Structured data validation
- Workflow state management

### Cell Line Editor (`api/editor/`)
- Advanced editing interface
- Version control system
- Diff visualization
- Real-time collaboration features

### Ontologies (`api/ontologies/`)
- Controlled vocabulary management
- Data standardization
- Validation rules

## Key Models

- **`CellLineTemplate`**: Core model storing comprehensive cell line metadata
- **`TranscribedArticle`**: Manages PDF transcription and curation workflows
- **`CellLineVersion`**: Version control for tracking changes
- **`Article`**: Legacy article processing (being phased out)

## API Endpoints

### Core Endpoints
- `/api/transcribed-articles/` - Article management
- `/api/editor/` - Cell line editing and version control
- `/api/curation/` - AI curation workflows
- `/api/transcription/` - PDF transcription services
- `/api/ontologies/` - Ontology management

### Authentication
Currently configured for development. Production deployments should implement proper authentication and authorization.

## Development Workflow

1. **Feature Development**
   - Create feature branch
   - Implement changes following existing patterns
   - Run tests: `python manage.py test`
   - Lint frontend: `npm run lint`

2. **Database Changes**
   - Create migrations: `python manage.py makemigrations`
   - Apply migrations: `python manage.py migrate`

3. **AI Integration Testing**
   - Test with sample articles in development
   - Verify curation instructions in `api/curation/instructions/`

## Testing

```bash
# Backend tests
python manage.py test

# Frontend tests
cd api/front-end/my-app
npm test

# Specific test files
python manage.py test api.tests.test_curation_api
```

## Deployment

### Production Considerations
- Set `DJANGO_DEBUG=False`
- Configure secure secret keys
- Set up proper database backups
- Configure SSL certificates
- Set up monitoring and logging
- Implement proper authentication

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## Management Commands

```bash
# Load cell line templates
python manage.py load_celllines

# Cleanup old versions (keeps last 10)
python manage.py cleanup_old_versions

# Django shell
python manage.py shell
```

## Monitoring

### Logs
```bash
# View all logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f web
docker-compose logs -f frontend
docker-compose logs -f celery
```

### Celery Monitoring
```bash
# Monitor Celery tasks
celery -A config events

# Celery flower (if installed)
celery -A config flower
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow existing code conventions
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

[Add license information]

## Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation in `/docs/`
- Review the development documentation in `/Development/`

---

**Note**: This application handles sensitive research data. Ensure proper security measures are in place for production deployments.