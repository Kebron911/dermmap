# DermMap Docker Startup Script for Windows
param(
    [switch]$Dev
)

Write-Host "🐳 Starting DermMap in Docker..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    docker --version | Out-Null
} catch {
    Write-Host "❌ Docker is not installed!" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw
    }
} catch {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Docker is ready" -ForegroundColor Green
Write-Host ""

# Check for development or production mode
if ($Dev) {
    Write-Host "🔧 Starting in DEVELOPMENT mode (with hot reload)..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml up -d
    
    Write-Host ""
    Write-Host "✅ DermMap is starting!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Frontend:  http://localhost:5173 (Vite HMR)" -ForegroundColor White
    Write-Host "   Backend:   http://localhost:3001" -ForegroundColor White
    Write-Host "   Database:  localhost:5432" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 View logs: docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor Cyan
    Write-Host "🛑 Stop: docker-compose -f docker-compose.dev.yml down" -ForegroundColor Cyan
} else {
    Write-Host "🚀 Starting in PRODUCTION mode..." -ForegroundColor Green
    docker-compose up -d --build
    
    Write-Host ""
    Write-Host "✅ DermMap is starting!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Frontend:  http://localhost" -ForegroundColor White
    Write-Host "   Backend:   http://localhost:3001" -ForegroundColor White
    Write-Host "   Database:  localhost:5432" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 View logs: docker-compose logs -f" -ForegroundColor Cyan
    Write-Host "🛑 Stop: docker-compose down" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check health
Write-Host ""
docker-compose ps

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Demo credentials (password: demo123):" -ForegroundColor Cyan
Write-Host "  • MA: alex.ma@dermmap.com" -ForegroundColor White
Write-Host "  • Provider: sarah.dr@dermmap.com" -ForegroundColor White
Write-Host "  • Manager: taylor.mgr@dermmap.com" -ForegroundColor White
