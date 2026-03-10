# Local Development Without Docker

If you see **ERR_CONNECTION_REFUSED** errors in the browser console, it means the backend API is not running.

## Option 1: Start Docker (Recommended)

The easiest way is to use Docker:

```powershell
# Windows PowerShell
.\start-docker.ps1

# Or development mode with hot reload
.\start-docker.ps1 -Dev
```

This starts:
- PostgreSQL on port 54320
- Backend API on port 3001
- Frontend on port 80 (production) or 5173 (dev)

## Option 2: Frontend-Only Development

If you only want to develop the frontend without the backend:

### 1. Disable Sync Service

Edit `src/App.tsx` and comment out the sync initialization:

```typescript
// Start offline sync service
useEffect(() => {
  // syncService.init(); // Commented out for frontend-only dev
}, []);
```

### 2. Use Synthetic Data

The app will continue using `SYNTHETIC_PATIENTS` from `src/data/syntheticData.ts` when the API is unavailable.

### 3. Mock Login

Edit `src/store/appStore.ts` to bypass API login:

```typescript
login: async (email: string, password: string) => {
  // Mock login for frontend-only dev
  const demoUser = DEMO_USERS.find(u => u.email === email);
  if (demoUser) {
    set({ 
      currentUser: {
        id: demoUser.id,
        name: demoUser.name,
        role: demoUser.role,
        email: demoUser.email,
      },
      token: 'mock-token',
    });
    return true;
  }
  return false;
},
```

### 4. Start Frontend Only

```powershell
npm run dev
```

Access at: http://localhost:5173

## Option 3: Run Backend Manually (Without Docker)

### Prerequisites

- PostgreSQL 15+ installed locally
- Node.js 18+ installed

### Steps

1. **Start PostgreSQL**:
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE dermmap;"

# Run schema setup
cd backend
node src/db/setup.js

# Seed demo data
node src/db/seed.js
```

2. **Configure Backend**:

Create `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dermmap
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

3. **Install Backend Dependencies**:
```powershell
cd backend
npm install
```

4. **Start Backend**:
```powershell
npm run dev
```

Backend will run on http://localhost:3001

5. **Start Frontend** (in separate terminal):
```powershell
cd ..
npm run dev
```

Frontend will run on http://localhost:5173

## Troubleshooting

### "Cannot connect to server" on Login

**Problem**: Backend API is not running

**Solution**: 
- Start Docker: `.\start-docker.ps1`
- OR follow Option 3 above to run backend manually

### "Database not initialized" Error

**Problem**: IndexedDB is trying to initialize but fails in test environment

**Solution**: 
- This is expected during unit tests
- For manual testing, use the browser (not unit tests)
- Unit tests require API mocking (see INTEGRATION_TESTING.md)

### Port 3001 Already in Use

**Problem**: Another process is using port 3001

**Solution**:
```powershell
# Find process using port 3001
Get-NetTCPConnection -LocalPort 3001

# Kill the process
Stop-Process -Id <PID>

# Or change the port in backend/.env
PORT=3002
```

### CORS Errors

**Problem**: Frontend running on different origin than configured

**Solution**: Update `backend/.env`:
```env
CORS_ORIGIN=http://localhost:5173
```

## Development Workflow

### Recommended: Docker Development Mode

```powershell
docker-compose -f docker-compose.dev.yml up -d
```

**Benefits**:
- ✅ Auto-reload for frontend (Vite HMR)
- ✅ Auto-reload for backend (Nodemon)
- ✅ PostgreSQL included
- ✅ Consistent environment
- ✅ Code changes reflected immediately

**Access**:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Database: localhost:54320

### Frontend-Only: npm run dev

```powershell
npm run dev
```

**When to use**:
- Pure UI/component development
- No need for data persistence
- Working on styling/layout
- Testing with synthetic data

**Limitations**:
- ❌ Cannot create visits that persist
- ❌ Cannot upload photos
- ❌ Cannot test sync functionality
- ❌ Login redirects to credentials page

## API Status Indicator

The app shows connection status in the UI:

- 🟢 Green "Online" banner: Connected to backend
- 🟡 Yellow "Offline" banner: Working offline, changes queued
- ⚠️ Console warning: Backend unavailable (on first detection)

## Clean Start

If you encounter issues, reset everything:

### Docker
```powershell
# Stop and remove containers
docker-compose down

# Remove volumes (deletes database data)
docker-compose down -v

# Rebuild and start fresh
docker-compose up -d --build
```

### Local PostgreSQL
```sql
-- Drop and recreate database
DROP DATABASE dermmap;
CREATE DATABASE dermmap;

-- Then re-run setup.js and seed.js
```

### IndexedDB
Open browser DevTools → Application → IndexedDB → Delete "DermMapOfflineDB"

## Summary

| Scenario | Command | Backend Required? |
|----------|---------|-------------------|
| Full stack testing | `.\start-docker.ps1` | ✅ Included |
| Development with hot reload | `.\start-docker.ps1 -Dev` | ✅ Included |
| Frontend-only UI work | `npm run dev` | ❌ Optional |
| Manual backend + frontend | See Option 3 | ✅ Manual setup |

For most development, **use Docker** - it's the fastest and most reliable way to get started!
