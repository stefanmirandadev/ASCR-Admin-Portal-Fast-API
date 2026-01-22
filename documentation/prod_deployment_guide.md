# Production Deployment Guide

This guide covers deploying the ASCR Admin Portal to a production server for internal use.

## Prerequisites

- Docker and Docker Compose installed on production server
- Git installed on production server
- Server IP address or hostname
- OpenAI and Anthropic API keys

## Deployment Steps

### 1. Clone Repository on Production Server

```bash
git clone <your-repo-url>
cd ASCR-Admin-Portal-Fast-API
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# API Keys (required for AI curation)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Frontend configuration
NEXT_PUBLIC_BACKEND_API_URL=http://YOUR_SERVER_IP:8001
```

Replace `YOUR_SERVER_IP` with your actual server IP address (e.g., `http://192.168.1.100:8001`).

### 3. Update CORS Settings

Edit `services/backend/main.py` to allow requests from your production frontend:

```python
# Add your production URL to allow_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",              # dev
        "http://YOUR_SERVER_IP:3001",         # production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Replace `YOUR_SERVER_IP` with your actual server IP address.

### 4. Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs if needed
docker-compose logs -f
```

### 5. Access the Application

The application will be available at:
- **Frontend**: `http://YOUR_SERVER_IP:3001`
- **Backend API**: `http://YOUR_SERVER_IP:8001`
- **Backend API Docs**: `http://YOUR_SERVER_IP:8001/docs`

Admins should access the frontend URL to use the application.

## Port Configuration

The application uses the following ports:
- **3001**: Frontend (Next.js)
- **8001**: Backend (FastAPI)
- **6380**: Redis (internal, mapped from 6379)

Ensure these ports are:
- Open in your server's firewall
- Not blocked by security groups
- Available (not used by other services)

## Updating the Application

To pull latest changes:

```bash
# Stop services
docker-compose down

# Pull latest code
git pull origin main

# Rebuild and restart (if code changed)
docker-compose up -d --build

# Or just restart (if only data/config changed)
docker-compose up -d
```

## Monitoring

### Check Service Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f worker
```

### Restart a Service
```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart worker
```

## Data Persistence

Cell line data is stored in Docker volumes:
- `backend_data`: Contains working and ready cell line files
- `redis_data`: Task queue data

These volumes persist across container restarts. To back them up:

```bash
# Backup backend data
docker run --rm -v ascr-admin-portal-fast-api_backend_data:/data -v $(pwd):/backup alpine tar czf /backup/backend_data_backup.tar.gz -C /data .

# Restore backend data
docker run --rm -v ascr-admin-portal-fast-api_backend_data:/data -v $(pwd):/backup alpine tar xzf /backup/backend_data_backup.tar.gz -C /data
```

## Troubleshooting

### Frontend can't connect to backend
1. Check `NEXT_PUBLIC_BACKEND_API_URL` in `.env`
2. Verify backend is running: `docker-compose ps`
3. Check backend CORS settings in `services/backend/main.py`
4. Test backend directly: `curl http://YOUR_SERVER_IP:8001/health`

### Stats not showing on homepage
1. Verify backend `/stats` endpoint: `curl http://YOUR_SERVER_IP:8001/stats`
2. Check browser console for errors
3. Verify frontend can reach backend (see above)

### Celery worker not processing tasks
1. Check worker logs: `docker-compose logs -f worker`
2. Verify Redis is running: `docker-compose ps redis`
3. Restart worker: `docker-compose restart worker`

### Port conflicts
If ports are already in use, edit `docker-compose.yml` to use different ports:
```yaml
services:
  frontend:
    ports:
      - "NEW_PORT:3000"  # Change 3001 to your desired port
```

Remember to update `NEXT_PUBLIC_BACKEND_API_URL` and CORS settings accordingly.

## Security Notes

Since this is an internal admin tool:
- HTTP (not HTTPS) is acceptable for internal network use
- Consider restricting access via firewall rules to specific IP ranges
- Keep API keys secure and never commit them to git
- Regularly update dependencies with `docker-compose pull` and rebuild

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review API documentation: `http://YOUR_SERVER_IP:8001/docs`
- Check project README and CLAUDE.md for additional context
