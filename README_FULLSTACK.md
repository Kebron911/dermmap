# DermMap Full-Stack Setup Guide

## 🎯 Overview

DermMap now uses a **PostgreSQL backend** with **offline-first PWA** functionality:

- **Backend**: Node.js + Express + PostgreSQL + JWT auth
- **Frontend**: React + TypeScript + Zustand + Vite
- **Offline**: IndexedDB caching with automatic sync
- **Photos**: Stored as BLOBs in PostgreSQL database

All data persists in the database and survives page refreshes/restarts.

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Git** (for version control)

## 🚀 Quick Start

### 1. Install PostgreSQL

**Windows:**
```powershell
# Download and install from: https://www.postgresql.org/download/windows/
# During installation, remember your postgres user password
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```sql
-- Connect to PostgreSQL (use password you set during installation)
psql -U postgres

-- Create database
CREATE DATABASE dermmap;

-- Exit psql
\q
```

### 3. Setup Backend

```powershell
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your PostgreSQL password
notepad .env

# Set up database schema
npm run db:setup

# Seed with demo data
npm run db:seed

# Start backend server
npm run dev
```

Backend runs on **http://localhost:3001**

### 4. Setup Frontend

```powershell
# In a NEW terminal, navigate to project root
cd ..

# Install dependencies (if not already done)
npm install

# Create environment file
cp .env.example .env

# Start frontend development server
npm run dev
```

Frontend runs on **http://localhost:5173**

## 🔑 Demo Credentials

All passwords: `demo123`

| Role     | Email                     | Access Level                    |
|----------|---------------------------|---------------------------------|
| MA       | alex.ma@dermmap.com       | Patient docs, visit creation    |
| Provider | sarah.dr@dermmap.com      | All MA features + sign-off      |
| Manager  | taylor.mgr@dermmap.com    | Analytics, audit logs, settings |

## 📂 Project Structure

```
dermmap/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── db/             # Database setup, pool, seed
│   │   ├── routes/         # API endpoints (auth, patients, visits, etc.)
│   │   ├── middleware/     # JWT authentication
│   │   └── server.js       # Express app entry point
│   ├── package.json
│   └── README.md
│
├── src/                    # Frontend application
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── store/              # Zustand state management
│   ├── services/           # NEW - API client, IndexedDB, sync
│   │   ├── apiClient.ts    # HTTP API wrapper
│   │   ├── indexedDB.ts    # Offline storage
│   │   └── syncService.ts  # Sync orchestration
│   └── main.tsx
│
└── README_FULLSTACK.md     # This file
```

## 🔄 How Offline Sync Works

### 1. **Initial Load**
- Frontend fetches all data from API
- Data is cached in browser IndexedDB
- Last sync timestamp is recorded

### 2. **Online Mode**
- All changes go directly to backend API
- IndexedDB cache is updated simultaneously
- Syncs every 30 seconds automatically

### 3. **Offline Mode**
- All changes are queued locally in IndexedDB
- User continues working with cached data
- Changes are synced when connection is restored

### 4. **Connection Restored**
- Pending changes are pushed to server
- Server changes are pulled down
- Conflicts are detected and logged

## 🛠️ Development Workflow

### Running Both Servers

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
```

### Database Management

```powershell
cd backend

# Reset database (CAUTION: Deletes all data)
npm run db:setup
npm run db:seed

# Connect to database
psql -U postgres -d dermmap

# View tables
\dt

# Query patients
SELECT * FROM patients;

# Exit
\q
```

### Testing Offline Mode

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Enable **Offline** mode
4. Continue using the app - changes are queued
5. Disable offline mode - watch sync happen in console

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh JWT token

### Patients
- `GET /api/patients` - List all patients (with search)
- `GET /api/patients/:id` - Get patient with visits/lesions
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Visits
- `GET /api/visits/:id` - Get visit with lesions
- `POST /api/visits` - Create visit
- `PUT /api/visits/:id` - Update visit
- `DELETE /api/visits/:id` - Delete visit

### Lesions
- `POST /api/lesions` - Create lesion
- `PUT /api/lesions/:id` - Update lesion
- `DELETE /api/lesions/:id` - Delete lesion

### Photos
- `GET /api/photos/:id` - Get photo (binary image)
- `POST /api/photos` - Upload photo (base64)
- `DELETE /api/photos/:id` - Delete photo

### Sync
- `GET /api/sync/changes?since={timestamp}` - Pull changes
- `POST /api/sync/push` - Push local changes

## 🔐 Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **Role-Based Access** - MA, Provider, Manager roles
- ✅ **CORS Protection** - Configured for localhost development
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **Helmet.js** - Security headers

## 🐛 Troubleshooting

### Backend won't start
```
Error: connect ECONNREFUSED
```
**Solution**: Check if PostgreSQL is running:
```powershell
# Windows
Get-Service postgresql*

# If not running, start it:
Start-Service postgresql-x64-14
```

### Database connection error
```
Error: password authentication failed
```
**Solution**: Check `backend/.env` file - make sure `DB_PASSWORD` matches your PostgreSQL password.

### Frontend can't connect to API
```
Error: Failed to fetch
```
**Solution**:
1. Ensure backend is running on http://localhost:3001
2. Check `VITE_API_URL` in `.env` file
3. Restart frontend dev server

### Sync not working
```
Sync failed: 403 Forbidden
```
**Solution**:
1. Log out and log back in (token may be expired)
2. Check browser console for detailed errors
3. Verify you're logged in with valid credentials

## 🎨 New Features

### ✅ Persistent Data
- All data stored in PostgreSQL
- Survives app restarts
- Can be backed up/restored

### ✅ Real User Management
- Create accounts with email/password
- JWT-based authentication
- Role-based permissions

### ✅ Offline-First
- Works without internet connection
- Automatic sync when online
- Conflict detection

### ✅ Photo Storage
- Photos stored in database as BLOBs
- Efficient retrieval with caching
- Base64 upload support

### ✅ Multi-User Support
- Multiple users can work simultaneously
- Changes sync automatically
- Audit trail in sync_log table

## 📝 Next Steps

### Recommended Enhancements
1. **Conflict Resolution UI** - Show users when conflicts occur
2. **Photo Compression** - Reduce database size
3. **Pagination** - For large patient lists
4. **Search Improvements** - Full-text search
5. **Export/Import** - Backup/restore functionality
6. **Real-time Updates** - WebSocket for live sync
7. **Mobile App** - React Native version

### Production Deployment
1. **Environment Variables** - Set production values
2. **Database Backup** - Set up automated backups
3. **SSL/TLS** - Enable HTTPS
4. **Cloud Hosting** - Deploy to AWS/Azure/Heroku
5. **CDN** - Serve static assets
6. **Monitoring** - Set up error tracking (Sentry)

## 📚 Documentation

- **Backend API**: See `backend/README.md`
- **Frontend**: See main `README.md`
- **Database Schema**: See `backend/src/db/setup.js`
- **Type Definitions**: See `src/types/index.ts`

## 🤝 Contributing

1. Create feature branch
2. Test locally (both frontend + backend)
3. Run tests: `npm test`
4. Update documentation
5. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

---

**Need Help?** Check the troubleshooting section or open an issue on GitHub.
