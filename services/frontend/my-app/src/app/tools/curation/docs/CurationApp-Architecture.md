# CurationApp Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                CurationApp                                  │
│                           System Architecture                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Background    │
│   (Next.js)     │    │   (Django)      │    │   (Celery)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React App      │    │  Django API     │    │  Celery Workers │
│  - CurationPage │    │  - CurationView │    │  - curate_article│
│  - ArticlesTable│    │  - Status API   │    │  - bulk_curate  │
│  - ErrorModal   │    │  - Error API    │    │  - Mock Function│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Real-time      │    │   PostgreSQL    │    │     Redis       │
│  Polling        │    │   Database      │    │   Task Queue    │
│  (3s intervals) │    │   - Articles    │    │   - Task Store  │
└─────────────────┘    │   - CellLines   │    └─────────────────┘
                       └─────────────────┘
```

## Component Interaction Flow

### 1. User Workflow
```
User → CurationPage → ArticlesTable → CurationActions → API → Celery → Database
  ↑                                                                        │
  └────────────────────── Status Polling ←─────────────────────────────────┘
```

### 2. Real-time Updates Flow
```
CurationPage
    │
    ├── useStatusPolling Hook
    │   ├── 3s Polling Interval
    │   ├── AbortController (cleanup)
    │   └── Error Handling
    │
    └── API Endpoints
        ├── GET /api/curation/status/
        ├── GET /api/curation/articles/
        └── GET /api/curation/{id}/error_details/
```

### 3. Background Processing Flow
```
Bulk Curation Request
    │
    ├── CurationViewSet.bulk_curate()
    │   ├── Validate article_ids (max 20)
    │   ├── Check processing status
    │   └── Queue bulk_curate_articles_task
    │
    ├── bulk_curate_articles_task
    │   └── Queue individual curate_article_task for each article
    │
    └── curate_article_task
        ├── Update article status to 'processing'
        ├── Call mock_curation_function
        ├── Create/update CellLineTemplate
        └── Update article status to 'completed'/'failed'
```

## Data Flow Diagrams

### 1. Article Curation Data Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Article   │───▶│  Curation   │───▶│ CellLine    │───▶│   Article   │
│  (pending)  │    │   Process   │    │ Template    │    │(completed)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Error     │
                   │  Handling   │
                   └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Article   │
                   │  (failed)   │
                   └─────────────┘
```

### 2. Real-time Status Updates
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│   API       │───▶│  Database   │───▶│  Frontend   │
│  (Polling)  │    │  (Status)   │    │  (Query)    │    │ (Update UI) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       └───────────────────┼───────────────────┼───────────────────┘
                           │                   │
                           ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │  Error      │    │  Status     │
                   │  Details    │    │  Counts     │
                   └─────────────┘    └─────────────┘
```

## API Endpoint Mapping

### Curation API Endpoints
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Curation API                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  GET  /api/curation/articles/                                              │
│  └── Returns: List of articles with curation status                        │
│  └── Used by: ArticlesTable component for initial load                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/curation/bulk_curate/                                           │
│  └── Input: { article_ids: [1, 2, 3, ...] }                               │
│  └── Returns: { status: 'queued', task_id: '...', article_count: 3 }       │
│  └── Used by: CurationActions component for bulk processing                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  GET  /api/curation/status/                                                │
│  └── Returns: { articles: [...], total_count: 13, processing_count: 2,     │
│                completed_count: 8, failed_count: 3 }                       │
│  └── Used by: useStatusPolling hook for real-time updates                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  GET  /api/curation/{id}/error_details/                                    │
│  └── Returns: { article_id: 1, error_message: '...', curation_status: 'failed' } │
│  └── Used by: ErrorModal component for detailed error display              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cell Line Integration API
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GET  /api/editor/celllines/?curation_source={source}                      │
│  └── Returns: Filtered cell lines by curation source                       │
│  └── Used by: CustomCellLineEditor component for filtering                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Frontend Component Architecture

### Component Hierarchy
```
CurationPage (page.tsx)
├── StatusDashboard (inline)
├── ArticlesTable
│   ├── Table Headers
│   ├── Article Rows
│   │   ├── Checkbox Selection
│   │   ├── Status Indicators
│   │   └── Error Click Handlers
│   └── Loading States
├── CurationActions
│   ├── Selection Validation
│   ├── Confirmation Modal
│   └── API Integration
└── ErrorModal
    ├── Error Categorization
    ├── Troubleshooting Tips
    └── Error Details Display
```

### State Management Flow
```
CurationPage State
├── selectedArticles: number[]
├── isPolling: boolean
├── errorModalOpen: boolean
├── errorDetails: ErrorDetails | null
└── initialArticles: Article[]

useStatusPolling Hook
├── articles: Article[]
├── status: StatusResponse | null
├── loading: boolean
├── error: string | null
├── refresh: function
├── startPolling: function
└── stopPolling: function
```

## Backend Architecture

### Django ViewSet Structure
```
CurationViewSet (views.py)
├── bulk_curate() - POST /api/curation/bulk_curate/
├── status() - GET /api/curation/status/
├── error_details() - GET /api/curation/{id}/error_details/
└── articles() - GET /api/curation/articles/
```

### Celery Task Structure
```
Tasks (tasks.py)
├── curate_article_task(article_id)
│   ├── Article.start_curation()
│   ├── mock_curation_function()
│   ├── CellLineTemplate creation/update
│   └── Article.complete_curation() or Article.fail_curation()
│
└── bulk_curate_articles_task(article_ids)
    └── Queue individual curate_article_task for each article
```

### Database Schema
```
Article Model
├── curation_status: CharField (pending, processing, completed, failed)
├── curation_error: TextField (error messages)
├── curation_started_at: DateTimeField (when curation began)
└── Helper Methods: start_curation(), complete_curation(), fail_curation()

CellLineTemplate Model
└── curation_source: CharField (hpscreg, LLM, institution, manual)
```

## Integration Points

### Cell Line Browser Integration
```
CustomCellLineEditor (existing)
├── Curation Source Filter (new)
│   ├── Dropdown Selection
│   ├── Server-side Filtering
│   └── Real-time Updates
└── CellLineCard (enhanced)
    └── Curation Source Badge (new)
```

### Navigation Integration
```
AppLayout (existing)
├── Sidebar Navigation
│   └── "Curation" Link (new)
└── Page Content
    └── CurationPage (new)
```

## Error Handling Architecture

### Error Flow
```
Error Occurrence
├── Celery Task Error
│   ├── Exception caught
│   ├── Article.fail_curation(error_message)
│   └── Error logged
│
├── API Error
│   ├── HTTP status code returned
│   ├── Error message in response
│   └── Frontend error handling
│
└── Frontend Error
    ├── Error boundary catch
    ├── Error modal display
    └── Error reporting (if enabled)
```

### Error Categorization
```
Error Types
├── OpenAI API Errors
│   ├── API communication issues
│   └── Rate limiting
├── Data Processing Errors
│   ├── Content parsing failures
│   └── Validation errors
├── Network Errors
│   ├── Connection timeouts
│   └── Server errors
└── Application Errors
    ├── System-level failures
    └── Database errors
```

## Performance Architecture

### Optimization Strategies
```
Frontend Optimizations
├── React.memo for component memoization
├── useCallback for event handler optimization
├── Request cancellation with AbortController
├── Server-side filtering for large datasets
└── Optimized polling with proper cleanup

Backend Optimizations
├── Database indexing on frequently queried fields
├── Celery task queuing for concurrent processing
├── Efficient database queries with select_related
├── API response caching where appropriate
└── Rate limiting for bulk operations
```

### Monitoring Points
```
Performance Metrics
├── API Response Times
├── Frontend Render Performance
├── Memory Usage Patterns
├── Real-time Update Efficiency
└── Database Query Performance
```

## Security Architecture

### Current Security Measures
```
Security Implementation
├── Input Validation
│   ├── Article ID validation
│   ├── Bulk operation limits (max 20)
│   └── Data type validation
├── Rate Limiting
│   ├── Bulk curation limits
│   └── API endpoint protection
├── Error Sanitization
│   ├── Error message filtering
│   └── Sensitive data protection
└── CORS Configuration
    ├── Production-ready CORS settings
    └── Custom header support
```

### Future Security Considerations
```
Planned Security Features
├── Authentication Integration
├── Role-based Permissions
├── API Key Management
├── Audit Logging
└── Data Encryption
```

## Deployment Architecture

### Docker Services
```
Docker Compose Services
├── web (Django)
│   ├── API endpoints
│   ├── Database migrations
│   └── Static file serving
├── db (PostgreSQL)
│   ├── Article data
│   ├── CellLineTemplate data
│   └── Curation tracking
├── redis (Redis)
│   ├── Celery task queue
│   └── Session storage
├── celery (Celery Worker)
│   ├── Background task processing
│   └── Curation workflow
└── celery-beat (Celery Beat)
    └── Scheduled task management
```

### Environment Configuration
```
Environment Variables
├── NEXT_PUBLIC_API_URL
├── NEXT_PUBLIC_ENABLE_ERROR_REPORTING
├── NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT
├── NEXT_PUBLIC_ENABLE_PERFORMANCE_METRICS
├── POSTGRES_* (database configuration)
├── REDIS_URL (task queue configuration)
└── DJANGO_* (Django configuration)
``` 