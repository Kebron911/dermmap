# 🐳 DermMap Docker Setup

Complete containerized deployment with PostgreSQL, Backend API, and Frontend - all in Docker!

## 📦 What's Included

- **PostgreSQL 15** - Database with automatic schema setup and seeding
- **Backend API** - Node.js/Express with JWT authentication
- **Frontend** - React/Vite with Nginx (production) or Vite dev server (development)
- **Networking** - Internal Docker network for secure communication
- **Volumes** - Persistent data storage for PostgreSQL

## 🚀 Quick Start

### Prerequisites

Only Docker Desktop required:
- **Windows**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **macOS**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: [Install Docker Engine](https://docs.docker.com/engine/install/)

### Production Deployment (3 commands)

```powershell
# 1. Build and start all services
docker-compose up -d

# 2. Check status
docker-compose ps

# 3. View logs
docker-compose logs -f
```

**Access the application:**
- Frontend: http://localhost
- Backend API: http://localhost:3001
- Database: localhost:54320

### Development Mode (with hot reload)

```powershell
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Or run in background
docker-compose -f docker-compose.dev.yml up -d
```

**Access development servers:**
- Frontend: http://localhost:5173 (Vite with HMR)
- Backend API: http://localhost:3001 (Nodemon with hot reload)
- Database: localhost:54320

## 🔑 Demo Credentials

All passwords: `demo123`

| Role     | Email                     |
|----------|---------------------------|
| MA       | alex.ma@dermmap.com       |
| Provider | sarah.dr@dermmap.com      |
| Manager  | taylor.mgr@dermmap.com    |

## 📋 Common Commands

### Starting & Stopping

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (⚠️ deletes database data)
docker-compose down -v
```

### Viewing Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Rebuilding

```powershell
# Rebuild all containers
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build
```

### Database Management

```powershell
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d dermmap

# Reset database (recreate schema and seed data)
docker-compose exec backend npm run db:setup
docker-compose exec backend npm run db:seed

# Backup database
docker-compose exec postgres pg_dump -U postgres dermmap > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U postgres dermmap
```

### Shell Access

```powershell
# Backend container
docker-compose exec backend sh

# Frontend container
docker-compose exec frontend sh

# Database container
docker-compose exec postgres sh
```

### Monitoring

```powershell
# Container resource usage
docker stats

# Container processes
docker-compose top

# Health checks
docker-compose ps
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Host                        │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Frontend   │  │   Backend    │  │ Postgres │ │
│  │  (Nginx/     │  │  (Node.js/   │  │    DB    │ │
│  │   Vite)      │  │   Express)   │  │          │ │
│  │              │  │              │  │          │ │
│  │  Port: 80    │  │  Port: 3001  │  │ Port:    │ │
│  │  or 5173     │  │              │  │  54320   │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                │       │
│         └─────────────────┴────────────────┘       │
│                dermmap-network                     │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │           postgres_data (volume)             │  │
│  │         Persistent Database Storage          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Environment Variables

**Backend** (in `docker-compose.yml`):
```yaml
environment:
  DB_HOST: postgres
  DB_PORT: 5432
  DB_NAME: dermmap
  DB_USER: postgres
  DB_PASSWORD: postgres
  JWT_SECRET: your-secret-key
  CORS_ORIGIN: http://localhost
```

**Frontend** (in `docker-compose.yml`):
```yaml
environment:
  VITE_API_URL: http://localhost:3001/api
```

### Ports

| Service   | Internal | External | Customizable |
|-----------|----------|----------|--------------|  
| Frontend  | 80       | 80       | Yes          |
| Backend   | 3001     | 3001     | Yes          |
| Postgres  | 5432     | 54320    | Yes          |

**Change ports** by editing `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Change external port to 8080
```

### Volumes

- **postgres_data**: Database files (persists between container restarts)
- **Backend source** (dev only): Mounted for hot reload
- **Frontend source** (dev only): Mounted for hot reload

## 🐛 Troubleshooting

### Backend won't start
```
Error: connect ECONNREFUSED
```
**Solution**: Wait for PostgreSQL health check to pass:
```powershell
docker-compose logs postgres
docker-compose ps  # Check health status
```

### Port already in use
```
Error: Bind for 0.0.0.0:80 failed: port is already allocated
```
**Solution**: Change port in `docker-compose.yml` or stop conflicting service:
```powershell
# Windows - find process using port 80
netstat -ano | findstr :80

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Database connection failed
```powershell
# Check if postgres is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Can't connect to API from frontend
```
Failed to fetch
```
**Solution**: Verify backend is running and CORS is configured:
```powershell
# Check backend health
curl http://localhost:3001/health

# View backend logs
docker-compose logs backend
```

### Hot reload not working (dev mode)
```powershell
# Ensure volumes are mounted correctly
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d

# Check volume mounts
docker-compose -f docker-compose.dev.yml ps
```

### Reset everything
```powershell
# Nuclear option - remove everything
docker-compose down -v
docker system prune -a
docker volume prune

# Start fresh
docker-compose up -d --build
```

## 🚢 Deployment

### Production Checklist

1. **Change secrets**:
   ```yaml
   JWT_SECRET: <generate-random-string>
   POSTGRES_PASSWORD: <secure-password>
   ```

2. **Update CORS origin**:
   ```yaml
   CORS_ORIGIN: https://yourdomain.com
   ```

3. **Use environment file**:
   ```powershell
   # Create .env file
   JWT_SECRET=your-production-secret
   POSTGRES_PASSWORD=secure-password
   
   # Reference in docker-compose.yml
   environment:
     JWT_SECRET: ${JWT_SECRET}
   ```

4. **Enable SSL/TLS** (add reverse proxy like Traefik or Nginx)

5. **Set resource limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
   ```

### Cloud Deployment

**AWS ECS / Azure Container Apps / Google Cloud Run**:
1. Push images to container registry
2. Use production `docker-compose.yml`
3. Configure managed PostgreSQL
4. Set up load balancer with SSL

**Docker Swarm**:
```powershell
docker swarm init
docker stack deploy -c docker-compose.yml dermmap
```

**Kubernetes**:
```powershell
# Generate Kubernetes manifests
kompose convert -f docker-compose.yml
kubectl apply -f .
```

## 📊 Performance

### Optimize Images

```powershell
# Check image sizes
docker images | grep dermmap

# Multi-stage builds are already optimized
# Frontend: ~50MB (nginx + static files)
# Backend: ~150MB (node:alpine + dependencies)
```

### Resource Monitoring

```powershell
# Real-time stats
docker stats

# Limit resources in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

## 🔒 Security

### Best Practices

✅ **Secrets management**: Use Docker secrets or environment files  
✅ **Network isolation**: Services communicate via internal network  
✅ **Non-root users**: Containers run as non-root where possible  
✅ **Health checks**: Automatic container restart on failure  
✅ **Volume permissions**: Proper file ownership

### Scan for Vulnerabilities

```powershell
# Scan images
docker scan dermmap-backend:latest
docker scan dermmap-frontend:latest
```

## 💡 Tips

### Speed up builds
```powershell
# Use BuildKit
DOCKER_BUILDKIT=1 docker-compose build

# Cache dependencies
# (already configured in Dockerfiles)
```

### Clean up space
```powershell
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

### Multiple environments
```powershell
# Development
docker-compose -f docker-compose.dev.yml up

# Staging
docker-compose -f docker-compose.staging.yml up

# Production
docker-compose up
```

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Nginx Docker Hub](https://hub.docker.com/_/nginx)

## 🆘 Support

**Common Issues**: See troubleshooting section above  
**Logs**: Always check logs first with `docker-compose logs`  
**Community**: Docker Community Forums, Stack Overflow

---

**No PostgreSQL installation required!** 🎉  
Everything runs in containers - just install Docker and run `docker-compose up`.
