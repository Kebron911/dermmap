# DermMap Integration Testing Guide

## ✅ Completed Tasks

All major implementation tasks have been completed:

1. ✅ Backend API with PostgreSQL database
2. ✅ Frontend API client integration
3. ✅ Offline-first IndexedDB caching
4. ✅ Sync service for online/offline coordination
5. ✅ Docker containerization with unique PostgreSQL port (54320)
6. ✅ Zustand store integrated with API

## 🚀 Quick Start - Full Stack Testing

### Prerequisites

- Docker Desktop installed and running
- Ports available: 80 (frontend), 3001 (backend), 54320 (PostgreSQL)

### Step 1: Start the Docker Stack

**Windows (PowerShell):**
```powershell
.\start-docker.ps1
```

**Linux/macOS:**
```bash
./start-docker.sh
```

This will:
- Build and start PostgreSQL on port 54320
- Build and start Express backend on port 3001
- Build and start React frontend on port 80
- Create database schema
- Seed demo data

### Step 2: Wait for Health Checks

Monitor the startup:
```powershell
docker-compose ps
docker-compose logs -f backend
```

Wait for:
- `✓ Database setup completed`
- `✓ Demo data seeded successfully`
- `Server running on port 3001`

### Step 3: Access the Application

Open your browser to: **http://localhost**

## 🧪 Integration Test Scenarios

### Test 1: Authentication & Login

**Demo Credentials:**
- **MA**: alex.ma@dermmap.com / demo123
- **Provider**: sarah.dr@dermmap.com / demo123  
- **Manager**: taylor.mgr@dermmap.com / demo123

**Steps:**
1. Navigate to http://localhost
2. Select a demo user (e.g., Alex Martinez - MA)
3. Email and password auto-fill
4. Click "Continue" → Enter any 6-digit MFA code → Click "Sign In"
5. ✅ **Expected**: Redirect to appropriate landing page based on role

### Test 2: Patient Data Loading

**Steps:**
1. After login as MA, you should see "Today's Schedule"
2. Click "Patient Search" in sidebar
3. ✅ **Expected**: See 3 patients loaded from PostgreSQL:
   - Emma Johnson (MRN-2024-001)
   - Michael Chen (MRN-2024-002)
   - Sarah Williams (MRN-2024-003)

### Test 3: Visit Creation & Lesion Documentation

**Steps:**
1. Search for patient "Emma Johnson"
2. Click "Start New Visit"
3. Add a new lesion by clicking on body map
4. Fill in lesion details (size, color, shape, etc.)
5. Upload a photo
6. Save the lesion
7. ✅ **Expected**: 
   - Visit created in database
   - Lesion saved with photo
   - Data persists when refreshing page

### Test 4: Offline Functionality

**Steps:**
1. With the app open, open DevTools (F12)
2. Go to Network tab → Set throttling to "Offline"
3. Try to add a new lesion
4. ✅ **Expected**: 
   - Changes queued in IndexedDB
   - Yellow "Offline" banner appears
   - UI still functional
5. Switch back to "Online"
6. ✅ **Expected**:
   - Green "Back Online" banner briefly
   - Pending changes sync to server automatically

### Test 5: Data Persistence

**Steps:**
1. Create a visit with lesions
2. Log out
3. Stop Docker containers: `docker-compose down`
4. Restart: `docker-compose up -d`
5. Log back in
6. ✅ **Expected**: All data still present (PostgreSQL volume persistence)

### Test 6: Database Inspection

**Direct database access:**
```powershell
docker exec -it dermmap-postgres psql -U postgres -d dermmap
```

**SQL Queries:**
```sql
-- Check seeded data
SELECT * FROM users;
SELECT * FROM patients;
SELECT * FROM visits;
SELECT * FROM lesions;

-- Check created data
SELECT v.visit_id, v.visit_date, p.first_name, p.last_name 
FROM visits v 
JOIN patients p ON v.patient_id = p.patient_id 
ORDER BY v.created_at DESC 
LIMIT 5;

-- Exit
\q
```

## 📊 API Endpoint Testing

### Using curl (PowerShell):

**Login:**
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"alex.ma@dermmap.com","password":"demo123"}'

$token = $response.token
```

**Get Patients:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/patients" `
  -Headers @{"Authorization"="Bearer $token"}
```

**Create Visit:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/visits" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body '{"patient_id":"p-001","provider_name":"Dr. Mitchell","ma_name":"Alex M."}'
```

## 🐛 Troubleshooting

### Issue: Port Conflicts

If ports are already in use:

```powershell
# Check what's using ports
Get-NetTCPConnection -LocalPort 80,3001,54320

# Change ports in docker-compose.yml if needed
```

### Issue: Database Not Accessible

```powershell
# Check PostgreSQL logs
docker-compose logs postgres

# Restart just the database
docker-compose restart postgres
```

### Issue: Frontend Not Loading

```powershell
# Check all container status
docker-compose ps

# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Issue: API Connection Errors

```powershell
# Check backend logs for errors
docker compose logs -f backend

# Verify backend is healthy
curl http://localhost:3001/health

# Check network connectivity
docker network inspect dermmap-network
```

## 📝 Known Limitations

### Unit Tests

Unit tests currently fail because they attempt real API calls. For production, you should:

1. Mock `apiClient` in tests using Vitest's `vi.mock()`
2. Mock `indexedDB` service
3. Use MSW (Mock Service Worker) for API mocking

Example test mock:
```typescript
vi.mock('../services/apiClient', () => ({
  apiClient: {
    login: vi.fn().mockResolvedValue({ user: {...}, token: 'test-token' }),
    getPatients: vi.fn().mockResolvedValue([...]),
    createVisit: vi.fn().mockResolvedValue({...}),
    // ... other mocked methods
  }
}));
```

## ✅ Success Criteria

Integration is successful if:

- ✅ Docker containers start without errors
- ✅ Database seeding completes (3 patients, 5 users, demo data)
- ✅ Login works with demo credentials
- ✅ Patient list loads from PostgreSQL
- ✅ Can create visits and add lesions
- ✅ Data persists across container restarts
- ✅ Offline mode queues changes
- ✅ Online sync pushes queued changes
- ✅ Photos upload and display correctly

## 🔄 Development Workflow

### Development Mode with Hot Reload

```powershell
docker-compose -f docker-compose.dev.yml up -d
```

Access:
- Frontend (Vite HMR): http://localhost:5173
- Backend (Nodemon): http://localhost:3001
- Database: localhost:54320

### Production Mode

```powershell
docker-compose up -d
```

Access:
- Application: http://localhost

## 📚 Additional Documentation

- [DOCKER.md](DOCKER.md) - Complete Docker guide (476 lines)
- [README.md](README.md) - Project overview and setup
- [backend/README.md](backend/README.md) - Backend API documentation

## 🎯 Next Steps (Future Enhancements)

1. **Unit Test Mocking**: Add proper API/IndexedDB mocks for unit tests
2. **E2E Testing**: Implement Playwright/Cypress for automated UI testing
3. **CI/CD Pipeline**: Add GitHub Actions for automated testing and deployment
4. **Performance Testing**: Load testing with k6 or Artillery
5. **Security Audit**: JWT refresh tokens, CSRF protection, rate limiting
6. **Monitoring**: Add Sentry error tracking, analytics, performance monitoring
