# CurationApp Developer Documentation

## Table of Contents
1. [High-Level Overview](#high-level-overview)
2. [Technical Architecture](#technical-architecture)
3. [Implementation Details](#implementation-details)
4. [Integration Points](#integration-points)
5. [Configuration and Environment](#configuration-and-environment)
6. [Development Guidelines](#development-guidelines)
7. [Common Development Tasks](#common-development-tasks)
8. [Testing Strategy](#testing-strategy)
9. [Troubleshooting](#troubleshooting)

## High-Level Overview

### Purpose and Context
The CurationApp is an AI-assisted curation system designed for bulk processing of stem cell transcription records. It addresses the time-consuming and error-prone nature of manual curation by providing an automated workflow that can process up to 20 articles concurrently.

**Primary Users**: Dr. Suzy Butcher and other principal curators at ASCR
**Integration Context**: Part of the larger ASCR AdminPortal ecosystem alongside the CellLineEditor and other research tools

### Key Features
- **Bulk Article Selection**: Multi-select interface for choosing up to 20 articles for curation
- **Real-time Status Updates**: 3-second polling mechanism for live progress monitoring
- **Background Processing**: Celery-based task queue for non-blocking curation operations
- **Comprehensive Error Handling**: Detailed error categorization and troubleshooting guidance
- **Cell Line Integration**: Browser integration with curation source filtering
- **Accessibility Compliance**: WCAG 2.1 AA standards implementation

### User Workflow
1. Navigate to `/tools/curation` in the AdminPortal
2. Select articles for curation (up to 20 items maximum)
3. Initiate bulk curation process with confirmation
4. Monitor real-time progress via status dashboard
5. View detailed error information for failed curations
6. Filter cell lines by curation source in the editor

## Technical Architecture

### System Overview
- **Backend**: Django 5.0.2 + DRF + Celery + PostgreSQL
- **Frontend**: Next.js 15.3.4 + React 19.0.0 + Tailwind CSS
- **Background Processing**: Celery with Redis for task queuing
- **Real-time Updates**: 3-second polling with request cancellation
- **Error Handling**: Comprehensive error categorization and reporting

### Data Models

#### Article Model
The Article model (future: TranscriptionRecord) contains curation-specific fields:
- `curation_error`: TextField for storing error messages from failed curations
- `curation_started_at`: DateTimeField tracking when curation began
- `curation_status`: CharField with choices (pending, processing, completed, failed)

**Helper Methods**:
- `start_curation()`: Sets status to processing and records start time
- `complete_curation()`: Sets status to completed
- `fail_curation(error_message)`: Sets status to failed with error details

#### CellLineTemplate Model
Enhanced with curation tracking:
- `curation_source`: CharField with choices (hpscreg, LLM, institution, manual)

### API Endpoints

#### Curation Endpoints
- `GET /api/curation/articles/` - List all articles with curation status
- `POST /api/curation/bulk_curate/` - Initiate bulk curation (max 20 articles)
- `GET /api/curation/status/` - Get real-time status counts and article list
- `GET /api/curation/{id}/error_details/` - Get detailed error information

#### Cell Line Integration
- `GET /api/editor/celllines/` - Enhanced with `curation_source` filtering parameter

### Celery Tasks

#### Individual Curation Task
```python
@shared_task
def curate_article_task(article_id)
```
- Processes single article with mock curation function
- Updates article status and creates CellLineTemplate records
- Handles errors and updates article with failure details

#### Bulk Curation Task
```python
@shared_task
def bulk_curate_articles_task(article_ids)
```
- Orchestrates bulk curation by queuing individual tasks
- Returns task IDs for tracking
- No retry logic (as per requirements)

#### OpenAI Curation Function
```python
def curate_article_with_openai(transcription_content)
```
- Real OpenAI GPT-4o API integration
- Uses structured output parsing with CellLineTemplate model
- Loads curation instructions from `api/curation/instructions/`
- Returns structured CellLineTemplate data
- Sets `curation_source: 'LLM'`
- Comprehensive error handling with specific error messages

## Implementation Details

### Frontend Architecture

#### Core Components
- **CurationPage**: Main page component at `/tools/curation/page.tsx`
- **ArticlesTable**: Multi-select table with status indicators and real-time updates
- **CurationActions**: Bulk curation controls with validation and confirmation
- **ErrorModal**: Comprehensive error display with categorization and troubleshooting
- **StatusDashboard**: Real-time status counts in card layout

#### State Management
- React hooks for local state management
- Custom polling hook for real-time updates
- Optimized re-rendering with React.memo and useCallback
- Request cancellation to prevent race conditions

#### Real-time System
**Polling Mechanism**:
- 3-second intervals during active processing
- Automatic start/stop based on processing state
- AbortController integration for proper cleanup
- Request cancellation to prevent memory leaks

**Status Updates**:
- Live status indicators with animations
- Real-time counts for all processing states
- Error categorization and troubleshooting guidance

### Backend Architecture

#### Key Files
- `api/curation/views.py`: CurationViewSet with all API endpoint implementations
- `api/tasks.py`: Celery task definitions and mock curation function
- `api/models.py`: Enhanced Article and CellLineTemplate models
- `api/serializers.py`: API serialization with curation fields

#### Background Processing
- Celery workers handle up to 20 concurrent curation requests
- Task status tracking and error propagation
- No retry logic for failed tasks
- Comprehensive error logging
- Real OpenAI API integration with structured output parsing

#### Error Handling
**Error Categories**:
- OpenAI API errors (with specific error messages)
- Curation instructions loading errors
- Data processing errors
- Network errors
- Application errors

**Error Display**:
- Modal with detailed error information
- User-friendly troubleshooting tips
- Error reporting system for production monitoring

### Configuration System

#### Environment Configuration (`config.ts`)
- Environment-aware API URLs and timeouts
- Polling configuration with retry logic
- Feature flags for gradual rollout
- Performance monitoring settings

#### Error Reporting (`errorReporting.ts`)
- Queue-based error reporting with batching
- Performance monitoring integration
- Global error handlers for unhandled errors
- React integration with error boundary wrapper

## Integration Points

### Cell Line Browser Integration
**Location**: `/tools/editor` (existing cell line browser)
**Enhancements**:
- Added `curation_source` filter dropdown to existing selector
- Server-side filtering in `api/editor/views.py`
- Visual badges showing curation source on cell line cards
- Real-time updates when filter changes

**Key Implementation**:
```python
# Backend filtering in api/editor/views.py
curation_source = self.request.query_params.get('curation_source', None)
if curation_source:
    queryset = queryset.filter(curation_source=curation_source)
```

### Navigation Integration
- **Sidebar Integration**: "Curation" link added to existing navigation
- **Layout Integration**: Uses existing AppLayout component
- **Routing**: Next.js folder-based routing at `/tools/curation`

### API Configuration
- **Centralized Configuration**: All API calls use `api.ts` configuration
- **Environment Awareness**: Development vs production URL handling
- **Consistent Endpoints**: Standardized API endpoint structure

## Configuration and Environment

### Environment Variables

#### Required for Production
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_ENABLE_ERROR_REPORTING`: Enable error reporting (true/false)
- `NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT`: Error reporting endpoint URL
- `NEXT_PUBLIC_ENABLE_PERFORMANCE_METRICS`: Performance monitoring (true/false)
- `OPENAI_API_KEY`: OpenAI API key for curation functionality

#### Development Defaults
- API URL defaults to `http://localhost:8000`
- Error reporting disabled by default
- Performance metrics disabled by default
- Polling interval: 3000ms

### Database Configuration
**Required Fields**:
- `curation_source` field in CellLineTemplate model
- `curation_error` and `curation_started_at` fields in Article model
- Migration files available for schema updates

### Curation Instructions Configuration
**Location**: `api/curation/instructions/`
**Format**: Markdown files with field-specific instructions
**Loading**: Automatic loading and combination of all instruction files
**Error Handling**: Clear error messages if instructions directory is missing
**Integration**: Used by OpenAI API for structured cell line data extraction

### Docker Configuration
- **Services**: web, db, redis, celery, celery-beat
- **Database migrations**: Applied automatically
- **Celery workers**: Active and processing tasks
- **Container health**: All services stable

## Development Guidelines

### Code Organization

#### Frontend Structure
```
/tools/curation/
├── components/          # React components
│   ├── ArticlesTable.tsx
│   ├── CurationActions.tsx
│   ├── ErrorModal.tsx
│   ├── LoadingStates.tsx
│   └── AccessibilityEnhancements.tsx
├── hooks/              # Custom React hooks
│   ├── useStatusPolling.ts
│   └── useOptimizedPolling.ts
├── __tests__/          # Test files
└── page.tsx           # Main page component
```

#### Backend Structure
```
api/
├── curation/           # Curation-specific views and URLs
├── editor/            # Cell line browser integration
├── tasks.py           # Celery task definitions
└── models.py          # Data model definitions
```

### Performance Considerations

#### Frontend Optimizations
- Server-side filtering for large datasets
- Request cancellation to prevent memory leaks
- React.memo and useCallback for efficient re-rendering
- Optimized polling with proper cleanup

#### Backend Optimizations
- Database indexing on frequently queried fields
- Celery task queuing for concurrent processing
- API response caching where appropriate
- Efficient database queries with select_related/prefetch_related

### Accessibility Standards
- **WCAG 2.1 AA Compliance**: All components include proper ARIA labels
- **Keyboard Navigation**: Logical tab sequence and focus management
- **Screen Reader Support**: Dynamic status announcements and error descriptions
- **High Contrast Support**: Environment-aware contrast settings

## Common Development Tasks

### Adding New Error Types
1. Update error categorization in `ErrorModal.tsx`
2. Add error handling in Celery tasks (`api/tasks.py`)
3. Update error display logic
4. Test error scenarios with new error types

### Modifying Curation Process
1. Update Celery task logic in `api/tasks.py`
2. Modify OpenAI integration in `api/curation/curate.py`
3. Update curation instructions in `api/curation/instructions/`
4. Modify API endpoints if needed (`api/curation/views.py`)
5. Update frontend status handling
6. Test with various article types

### Adding New Status Types
1. Update Article model status choices (`api/models.py`)
2. Modify API serializers (`api/serializers.py`)
3. Update frontend status indicators
4. Add status-specific UI components

### Performance Optimization
1. Use performance monitoring utilities (`config.ts`)
2. Implement server-side filtering
3. Optimize database queries
4. Monitor real-time update performance

### Cell Line Integration Enhancements
1. Add new filter parameters to `api/editor/views.py`
2. Update frontend filter UI in `CustomCellLineEditor.tsx`
3. Enhance cell line card display
4. Test filtering with large datasets

## Testing Strategy

### Frontend Testing
**Component Tests**:
- Unit tests for individual components
- Integration tests for API communication
- Performance testing for large datasets
- Accessibility testing with ARIA compliance

**Test Files**:
- `CurationPage.test.tsx`: Main page component tests
- `integration.test.tsx`: API integration testing
- `performance.test.tsx`: Performance measurement utilities
- `errorModal.test.tsx`: Error handling tests

### Backend Testing
**API Tests**:
- Endpoint functionality tests
- Input validation tests
- Error handling tests
- Performance tests for large datasets

**Model Tests**:
- Curation workflow tests
- Status transition tests
- Error handling tests
- Field validation tests

### Manual Testing Checklist
1. Navigate to `/tools/curation` - Verify page loads
2. Articles load from API - Check data display
3. Multi-select functionality - Test 20-item limit
4. Status indicators display - Verify all states
5. Responsive design - Test different screen sizes
6. Error handling - Test network failures
7. Confirmation dialog - Verify modal behavior
8. API integration - Test POST requests
9. Real-time updates - Verify polling functionality
10. Error modal - Test error details display

### Performance Testing
**Utilities Available**:
- Performance measurement hooks
- Large dataset simulation
- Memory usage monitoring
- API response time tracking

## Troubleshooting

### Common Issues

#### Real-time Updates Not Working
**Symptoms**: Status not updating, polling not starting
**Diagnosis**:
- Check polling hook configuration
- Verify API endpoint responses
- Check network connectivity
- Review browser console for errors

**Solutions**:
- Restart polling with `startPolling()`
- Check API endpoint availability
- Verify environment configuration
- Clear browser cache

#### Curation Process Failing
**Symptoms**: Articles stuck in processing, error messages
**Diagnosis**:
- Check Celery worker status
- Review task logs for errors
- Verify OpenAI API configuration
- Check database connectivity

**Solutions**:
- Restart Celery workers
- Check task queue status
- Verify API credentials
- Review error logs

#### Performance Issues
**Symptoms**: Slow loading, UI lag, memory leaks
**Diagnosis**:
- Monitor API response times
- Check database query performance
- Review frontend rendering performance
- Analyze memory usage patterns

**Solutions**:
- Optimize database queries
- Implement server-side filtering
- Use React performance optimizations
- Monitor memory usage

### Debugging Tools

#### Frontend Debugging
- **React Developer Tools**: Component state inspection
- **Browser Network Tab**: API request monitoring
- **Console Logging**: Custom hooks debugging
- **Performance Monitoring**: Built-in utilities

#### Backend Debugging
- **Django Debug Toolbar**: Query optimization
- **Celery Task Monitoring**: Task status tracking
- **Database Query Logging**: Performance analysis
- **API Endpoint Testing**: Postman/curl testing

### Error Reporting
**Production Monitoring**:
- Error reporting system captures and queues errors
- Performance monitoring tracks slow operations
- Global error handlers catch unhandled errors
- React integration with error boundary wrapper

**Error Categories**:
- **Low**: Performance issues, user errors
- **Medium**: API errors, data processing issues
- **High**: Unhandled errors, promise rejections
- **Critical**: System failures, data corruption

### Performance Monitoring
**Metrics Tracked**:
- API response times
- Frontend render performance
- Memory usage patterns
- Real-time update efficiency

**Optimization Opportunities**:
- Database query optimization
- Frontend bundle size reduction
- Caching strategy implementation
- Polling interval adjustment

## Maintenance and Future Development

### Documentation Updates
- Update this documentation when adding new features
- Maintain code comments for complex logic
- Document API changes and breaking changes
- Keep testing procedures current

### Performance Monitoring
- Regular performance audits using built-in utilities
- Monitor real-world usage patterns
- Optimize based on actual user behavior
- Track error rates and resolution times

### Security Considerations
- Input validation on all API endpoints
- Rate limiting for bulk operations
- Error message sanitization
- Authentication integration (future)

### Scalability Planning
- Database indexing for large datasets
- Celery worker scaling for increased load
- Frontend optimization for performance
- Caching strategy for frequently accessed data 