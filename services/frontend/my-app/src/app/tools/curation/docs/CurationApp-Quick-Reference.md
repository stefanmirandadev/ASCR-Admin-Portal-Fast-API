# CurationApp Quick Reference Guide

## Key File Locations

### Frontend Components
- **Main Page**: `api/front-end/my-app/src/app/tools/curation/page.tsx`
- **Articles Table**: `api/front-end/my-app/src/app/tools/curation/components/ArticlesTable.tsx`
- **Curation Actions**: `api/front-end/my-app/src/app/tools/curation/components/CurationActions.tsx`
- **Error Modal**: `api/front-end/my-app/src/app/tools/curation/components/ErrorModal.tsx`
- **Loading States**: `api/front-end/my-app/src/app/tools/curation/components/LoadingStates.tsx`

### Frontend Hooks
- **Status Polling**: `api/front-end/my-app/src/app/tools/curation/hooks/useStatusPolling.ts`
- **Optimized Polling**: `api/front-end/my-app/src/app/tools/curation/hooks/useOptimizedPolling.ts`

### Backend Files
- **Curation Views**: `api/curation/views.py`
- **Celery Tasks**: `api/tasks.py`
- **Models**: `api/models.py`
- **Serializers**: `api/serializers.py`
- **Cell Line Integration**: `api/editor/views.py`

### Configuration
- **API Config**: `api/front-end/my-app/src/lib/api.ts`
- **App Config**: `api/front-end/my-app/src/lib/config.ts`
- **Error Reporting**: `api/front-end/my-app/src/lib/errorReporting.ts`

### Tests
- **Frontend Tests**: `api/front-end/my-app/src/app/tools/curation/__tests__/`
- **Backend Tests**: `api/tests/test_curation_api.py`

## API Endpoints

### Curation Endpoints
```
GET  /api/curation/articles/           # List articles with curation status
POST /api/curation/bulk_curate/        # Initiate bulk curation (max 20)
GET  /api/curation/status/             # Real-time status counts
GET  /api/curation/{id}/error_details/ # Error details for failed article
```

### Cell Line Integration
```
GET  /api/editor/celllines/?curation_source={source}  # Filter by curation source
```

## Environment Variables

### Required for Production
```bash
NEXT_PUBLIC_API_URL=http://your-api-domain.com
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT=https://your-error-endpoint.com
NEXT_PUBLIC_ENABLE_PERFORMANCE_METRICS=true
```

### Development Defaults
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false
NEXT_PUBLIC_POLLING_INTERVAL=3000
NEXT_PUBLIC_MAX_CURATION=20
```

## Common Commands

### Docker Commands
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs web
docker-compose logs celery

# Restart services
docker-compose restart web celery

# Run migrations
docker-compose exec web python manage.py migrate
```

### Development Commands
```bash
# Check database records
docker-compose exec web python manage.py shell
>>> from api.models import Article, CellLineTemplate
>>> Article.objects.count()
>>> CellLineTemplate.objects.filter(curation_source='LLM').count()

# Test API endpoints
curl http://localhost:8000/api/curation/articles/
curl http://localhost:8000/api/curation/status/
```

## Data Models

### Article Model Fields
```python
curation_status: 'pending' | 'processing' | 'completed' | 'failed'
curation_error: TextField (error messages)
curation_started_at: DateTimeField (when curation began)
```

### CellLineTemplate Model Fields
```python
curation_source: 'hpscreg' | 'LLM' | 'institution' | 'manual'
```

## Quick Troubleshooting

### Real-time Updates Not Working
1. Check browser console for errors
2. Verify API endpoint responses
3. Check polling hook configuration
4. Restart frontend container

### Curation Process Failing
1. Check Celery worker status: `docker-compose logs celery`
2. Verify task queue: Check Redis connection
3. Review error logs in Django admin
4. Check database connectivity

### Performance Issues
1. Monitor API response times
2. Check database query performance
3. Review frontend rendering
4. Analyze memory usage

## Testing Checklist

### Manual Testing
- [ ] Navigate to `/tools/curation`
- [ ] Articles load from API
- [ ] Multi-select works (20-item limit)
- [ ] Status indicators display correctly
- [ ] Responsive design works
- [ ] Error handling functions
- [ ] Confirmation dialog appears
- [ ] API integration works
- [ ] Real-time updates function
- [ ] Error modal displays details

### API Testing
- [ ] `GET /api/curation/articles/` returns articles
- [ ] `POST /api/curation/bulk_curate/` accepts article_ids
- [ ] `GET /api/curation/status/` returns counts
- [ ] `GET /api/curation/{id}/error_details/` returns errors
- [ ] Cell line filtering works with curation_source

## Performance Metrics

### Target Performance
- **API Response Time**: < 100ms for filtered queries
- **Frontend Render Time**: < 1s for large datasets
- **Polling Interval**: 3 seconds
- **Memory Usage**: Optimized with server-side filtering

### Monitoring
- Use built-in performance utilities
- Monitor real-time update efficiency
- Track error rates and resolution times
- Analyze memory usage patterns

## Error Categories

### Error Types
- **OpenAI API errors**: API communication issues
- **Data processing errors**: Content parsing failures
- **Network errors**: Connection timeouts
- **Application errors**: System-level failures

### Error Reporting
- **Low**: Performance issues, user errors
- **Medium**: API errors, data processing issues
- **High**: Unhandled errors, promise rejections
- **Critical**: System failures, data corruption

## Integration Points

### Cell Line Browser
- **Location**: `/tools/editor`
- **Enhancement**: Added curation_source filter
- **Files**: `CustomCellLineEditor.tsx`, `CellLineCard.tsx`

### Navigation
- **Sidebar**: "Curation" link added
- **Layout**: Uses existing AppLayout
- **Routing**: Next.js folder-based at `/tools/curation`

## Development Workflow

### Adding New Features
1. Update models if needed (`api/models.py`)
2. Add API endpoints (`api/curation/views.py`)
3. Create Celery tasks (`api/tasks.py`)
4. Build frontend components
5. Add tests
6. Update documentation

### Code Standards
- **Frontend**: TypeScript, React hooks, Tailwind CSS
- **Backend**: Django, DRF, Celery
- **Testing**: Component tests, API tests, performance tests
- **Accessibility**: WCAG 2.1 AA compliance

## Security Notes

### Current State
- Input validation on all endpoints
- Rate limiting for bulk operations
- Error message sanitization
- No authentication (future requirement)

### Future Considerations
- Authentication integration
- Role-based permissions
- API key management
- Audit logging 