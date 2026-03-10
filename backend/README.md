# DermMap Backend API

PostgreSQL + Express REST API with JWT authentication, photo BLOB storage, and offline sync support.

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Create PostgreSQL database:**
```sql
CREATE DATABASE dermmap;
```

4. **Set up database schema:**
```bash
npm run db:setup
```

5. **Seed with demo data:**
```bash
npm run db:seed
```

6. **Start server:**
```bash
npm run dev
```

Server runs on http://localhost:3001

## Demo Users

All passwords: `demo123`

- **MA**: alex.ma@dermmap.com
- **Provider**: sarah.dr@dermmap.com  
- **Manager**: taylor.mgr@dermmap.com

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/refresh` - Refresh token

### Patients
- `GET /api/patients` - List patients (with search/pagination)
- `GET /api/patients/:patientId` - Get patient with visits/lesions
- `POST /api/patients` - Create patient
- `PUT /api/patients/:patientId` - Update patient
- `DELETE /api/patients/:patientId` - Delete patient

### Visits
- `GET /api/visits/:visitId` - Get visit with lesions
- `POST /api/visits` - Create visit
- `PUT /api/visits/:visitId` - Update visit (status, provider)
- `DELETE /api/visits/:visitId` - Delete visit

### Lesions
- `POST /api/lesions` - Create lesion
- `PUT /api/lesions/:lesionId` - Update lesion
- `DELETE /api/lesions/:lesionId` - Delete lesion

### Photos
- `GET /api/photos/:photoId` - Get photo (binary data)
- `POST /api/photos` - Upload photo (base64)
- `DELETE /api/photos/:photoId` - Delete photo

### Sync (Offline Support)
- `GET /api/sync/changes?since={timestamp}` - Get changes since timestamp
- `POST /api/sync/push` - Push local changes (batch)

## Authentication

All endpoints except `/health` and `/api/photos/:id` (GET) require JWT authentication.

**Headers:**
```
Authorization: Bearer <token>
```

## Photo Storage

Photos are stored as BLOBs in PostgreSQL. Upload format:

```json
{
  "photo_id": "ph-unique-id",
  "lesion_id": "l-lesion-id",
  "visit_id": "v-visit-id",
  "photo_data": "base64-encoded-image-data",
  "photo_type": "clinical",
  "mime_type": "image/jpeg"
}
```

## Offline Sync

The API supports offline-first clients through sync endpoints:

1. **Pull changes** - Get updates since last sync
2. **Push changes** - Submit local changes with conflict detection

Sync log tracks all operations for conflict resolution.

## Database Schema

- **users** - Authentication and user profiles
- **patients** - Patient demographics and medical history
- **visits** - Patient visit records (one-to-many with patients)
- **lesions** - Lesion documentation (one-to-many with visits)
- **photos** - Photo BLOBs (one-to-many with lesions)
- **sync_log** - Sync operation tracking

## Development

```bash
# Run with auto-reload
npm run dev

# Run production
npm start

# Reset database
npm run db:setup
npm run db:seed
```

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dermmap
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3001
NODE_ENV=development

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

CORS_ORIGIN=http://localhost:5173
```
