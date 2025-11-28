#!/bin/bash

echo "🚀 Starting ASCR Microservices..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file with default configuration..."
    cat > .env << 'EOF'
# AI Services
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Redis
REDIS_URL=redis://redis:6379/0

# Development
DEBUG=true
EOF
    echo "⚠️  Please edit .env with your actual API keys"
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check curation service
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Curation Service (8001) - Healthy"
else
    echo "❌ Curation Service (8001) - Not responding"
fi

# Check archive service
if curl -s http://localhost:8002/health > /dev/null; then
    echo "✅ Archive Service (8002) - Healthy"
else
    echo "❌ Archive Service (8002) - Not responding"
fi

echo ""
echo "🎉 Services started!"
echo ""
echo "📊 Service URLs:"
echo "   Frontend:        http://localhost:3001"
echo "   Curation API:    http://localhost:8001/docs"
echo "   Archive API:     http://localhost:8002/docs"
echo ""
echo "📝 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose down"