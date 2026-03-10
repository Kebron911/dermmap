#!/bin/bash
# DermMap Docker Startup Script

echo "🐳 Starting DermMap in Docker..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running!"
    echo "   Please start Docker Desktop"
    exit 1
fi

echo "✓ Docker is ready"
echo ""

# Check for development or production mode
if [ "$1" == "dev" ]; then
    echo "🔧 Starting in DEVELOPMENT mode (with hot reload)..."
    docker-compose -f docker-compose.dev.yml up -d
    
    echo ""
    echo "✅ DermMap is starting!"
    echo ""
    echo "   Frontend:  http://localhost:5173 (Vite HMR)"
    echo "   Backend:   http://localhost:3001"
    echo "   Database:  localhost:5432"
    echo ""
    echo "📋 View logs: docker-compose -f docker-compose.dev.yml logs -f"
    echo "🛑 Stop: docker-compose -f docker-compose.dev.yml down"
else
    echo "🚀 Starting in PRODUCTION mode..."
    docker-compose up -d --build
    
    echo ""
    echo "✅ DermMap is starting!"
    echo ""
    echo "   Frontend:  http://localhost"
    echo "   Backend:   http://localhost:3001"
    echo "   Database:  localhost:5432"
    echo ""
    echo "📋 View logs: docker-compose logs -f"
    echo "🛑 Stop: docker-compose down"
fi

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check health
echo ""
docker-compose ps

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Demo credentials (password: demo123):"
echo "  • MA: alex.ma@dermmap.com"
echo "  • Provider: sarah.dr@dermmap.com"
echo "  • Manager: taylor.mgr@dermmap.com"
