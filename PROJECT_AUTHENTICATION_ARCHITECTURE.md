# Firasah AI v2.0.0.2 - Authentication & Authorization Architecture

## Executive Summary

This document provides a comprehensive overview of how the Firasah AI platform implements user authentication, authorization, file access control, and data retrieval. The system uses **JWT-based token authentication** with role-based access control (RBAC) and file ownership verification.

---

## 1. USER AUTHENTICATION IMPLEMENTATION

### 1.1 Authentication Flow

```
User Login → Backend Validation → JWT Token Generation → Frontend Storage → All Future Requests
```

### 1.2 Key Components

#### Backend Authentication Service
**File**: [backend/src/services/authService.ts](backend/src/services/authService.ts)

**Core Functions**:
1. **`registerUser(credentials)`**
   - Accepts: `email`, `password`, `name` (optional)
   - Hashes password using bcryptjs (10 salt rounds)
   - Checks for duplicate emails (case-insensitive)
   - Stores user in `users` table
   - Returns user object without password

2. **`loginUser(email, password)`**
   - Normalizes email (lowercase + trim)
   - Retrieves user from database
   - Validates password using bcryptjs comparison
   - Generates JWT token with `user_id` and `email`
   - Returns: `{ user, token }`

3. **`verifyToken(token)`**
   - Uses `jsonwebtoken` library
   - Returns decoded payload or null
   - Payload contains: `user_id`, `email`, `iat`, `exp`

4. **`recordLoginEvent(userId, email, ipAddress, userAgent)`**
   - Creates `login_events` table if not exists
   - Logs login attempts with timestamps and metadata
   - Non-blocking (doesn't prevent login on failure)

#### Authentication Middleware
**File**: [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts)

**`authenticate(req, res, next)` Middleware**:
```typescript
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}
```

- Extracts Bearer token from `Authorization` header
- Verifies token using `verifyToken()`
- Sets `req.user` object with `id` and `email`
- Returns 401 if token missing, invalid, or expired
- Blocks unauthenticated access to protected routes

### 1.3 API Endpoints - Authentication Routes
**File**: [backend/src/routes/authRoutes.ts](backend/src/routes/authRoutes.ts)

| Endpoint | Method | Protection | Function |
|----------|--------|-----------|----------|
| `/api/auth/register` | POST | None | Create new user |
| `/api/auth/login` | POST | None | Authenticate user, return JWT |
| `/api/auth/profile` | GET | JWT Required | Get current user profile |
| `/api/auth/profile` | PUT | JWT Required | Update user profile |
| `/api/auth/change-password` | POST | JWT Required | Change user password |
| `/api/auth/logins/stats` | GET | None | Get login statistics |

**Example Request/Response**:
```bash
# Login Request
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Login Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 1.4 Token Management

**JWT Configuration** (from `authService.ts`):
- **Secret**: `process.env.JWT_SECRET` (default: 'your_secret_key')
- **Expiration**: `process.env.JWT_EXPIRE` (default: '7d')
- **Algorithm**: HS256
- **Payload**: `{ user_id, email, iat, exp }`

**Frontend Token Storage**:
- Stored in `localStorage` as `authToken`
- Automatically included in all API requests via axios interceptor
- Removed on logout or upon 401 response

---

## 2. AUTHORIZATION & USER ROLES

### 2.1 Current User Roles

The system supports two user roles:

| Role | Description | Capabilities |
|------|-------------|--------------|
| `user` | Default user role | Can view own files, create uploads |
| `super_admin` | Administrator role | Can access all files, admin operations |

**Database Location**: `users` table, `role` column (VARCHAR(20), default: 'user')

**Migration File**: [database/migrate_add_user_role.sql](database/migrate_add_user_role.sql) (if applied)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```

### 2.2 Role-Based Access Control (RBAC)

**Super Admin Middleware** (Planned/Mentioned):
**File**: [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts)

```typescript
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({
      message: 'Super admin access required',
    });
  }
  next();
};
```

**Current Usage**:
- `POST /api/fragments/process-all` - Super admin only (process all fragments)

### 2.3 File Ownership & Permission Checks

**Ownership Verification Middleware**:
**File**: [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts)

```typescript
export const requireFileOwnership = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Allow super_admin to access all files
  if (req.user?.role === 'super_admin') return next();
  
  // Regular users can only access their own files
  const file = await getOne('SELECT "createdBy" FROM sound_files WHERE file_id = $1', 
    [fileId]);
  
  if (file?.createdBy !== req.user?.email) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
```

**Protected File Routes**:
- `GET /api/fragments/file/:fileId` - Requires file ownership
- `GET /api/fragments/stats/:fileId` - Requires file ownership

---

## 3. DATABASE SCHEMA

### 3.1 Users Table

**File**: [database/create_users_table.sql](database/create_users_table.sql)

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) COLLATE "C",
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Fields**:
- `user_id`: Auto-incrementing primary key
- `email`: Unique, case-insensitive (queries use LOWER(TRIM(email)))
- `password`: Bcrypt hashed (never stored plaintext)
- `name`: User display name (defaults to "Unknown User")
- `role`: User role ('user' or 'super_admin')
- `created_at`, `updated_at`: Timestamps for auditing

**Example User**:
```json
{
  "user_id": 1,
  "email": "teacher@school.com",
  "password": "$2a$10$...", // bcrypt hash
  "name": "Ahmed Al-Harbi",
  "role": "user",
  "created_at": "2024-01-01T08:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### 3.2 Sound Files Table (Documents/Files)

**File**: [database/add_tables.sql](database/add_tables.sql)

```sql
CREATE TABLE sound_files (
  file_id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL COLLATE "C",
  filepath VARCHAR(500) NOT NULL COLLATE "C",
  createdBy VARCHAR(255) COLLATE "C",
  note TEXT COLLATE "C",
  class_id INTEGER,
  day_of_week VARCHAR(10) COLLATE "C",
  slot_date DATE,
  transcript TEXT COLLATE "C",
  transcript_language VARCHAR(10) COLLATE "C",
  transcript_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sound_files_filename ON sound_files(filename);
CREATE INDEX idx_sound_files_createdby ON sound_files(createdBy);
```

**Fields**:
- `file_id`: Unique file identifier
- `filename`: Original file name
- `filepath`: Server file path
- `createdBy`: Email of user who uploaded (links to `users.email`)
- `note`: Optional notes about the file
- `class_id`: Associated class
- `day_of_week`: When the recording occurred
- `slot_date`: Date of recording
- `transcript`: Full aggregated transcript
- `transcript_language`: Language of transcript
- `transcript_updated_at`: Last transcript update

**Example Sound File**:
```json
{
  "file_id": 42,
  "filename": "Grade6A_Math_20240115.wav",
  "filepath": "/uploads/audio/Grade6A_Math_20240115.wav",
  "createdBy": "teacher@school.com",
  "note": "Math class - Chapter 3 Quiz",
  "class_id": 5,
  "day_of_week": "Sunday",
  "slot_date": "2024-01-15",
  "transcript": "Today we're covering quadratic equations...",
  "transcript_language": "ar",
  "created_at": "2024-01-15T08:30:00Z"
}
```

### 3.3 Related Tables (Data Retrieval Context)

```sql
-- Lecture: Transcriptions from sound files
CREATE TABLE lecture (
    lecture_id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES sound_files(file_id) ON DELETE CASCADE,
    time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id),
    transcript TEXT,
    language VARCHAR(10),
    duration DECIMAL(10, 2),
    created_at TIMESTAMP
);

-- Login Events: Audit trail
CREATE TABLE login_events (
    login_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    email VARCHAR(255),
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT
);
```

---

## 4. FILES/DATA RETRIEVAL & DISPLAY

### 4.1 Backend API Endpoints - Data Retrieval

**Sound Files Service**:
**File**: [backend/src/services/soundFilesService.ts](backend/src/services/soundFilesService.ts)

| Function | Endpoint | SQL Query | Returns |
|----------|----------|-----------|---------|
| `getAllSoundFiles()` | GET /api/sound-files | `SELECT * FROM sound_files ORDER BY created_at DESC` | Array of all files |
| `getSoundFileById(fileId)` | GET /api/sound-files/:id | `SELECT * FROM sound_files WHERE file_id = $1` | Single file object |
| `getSoundFilesByCreator(createdBy)` | (Internal) | `SELECT * FROM sound_files WHERE createdBy = $1 ORDER BY created_at DESC` | Array of user's files |

**Fragment Endpoints**:
**File**: [backend/src/routes/fragmentRoutes.ts](backend/src/routes/fragmentRoutes.ts)

- `GET /api/fragments/file/:fileId` - Get all fragments for a sound file (protected by file ownership)
- `GET /api/fragments/lecture/:lectureId` - Get fragments for a lecture
- `GET /api/fragments/timeslot/:timeSlotId` - Get fragments for a time slot
- `GET /api/fragments/stats/:fileId` - Get fragment statistics

**Evidence Endpoints**:
**File**: [backend/src/routes/evidencesRoutes.ts](backend/src/routes/evidencesRoutes.ts)

- `GET /api/evidences/` - Get all evidences
- `GET /api/evidences/:id` - Get single evidence
- `GET /api/evidences/kpi/:kpiId` - Get evidences by KPI
- `GET /api/evidences/file/:fileId` - Get evidences for a file

**Dashboard Endpoints**:
**File**: [backend/src/routes/dashboardRoutes.ts](backend/src/routes/dashboardRoutes.ts)

- `GET /api/dashboard/kpi-cards` - Summary cards with metrics
- `GET /api/dashboard/domains-weeks` - Performance by domain and week
- `GET /api/dashboard/domains-subjects` - Performance by domain and subject
- `GET /api/dashboard/teacher-performance` - Teacher statistics
- `GET /api/dashboard/section-progress` - Section progress tracking
- `GET /api/dashboard/top-evidences` - Top evidence entries

### 4.2 Frontend Data Fetching

**API Client**:
**File**: [frontend/src/services/api.js](frontend/src/services/api.js)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
  },
});

// Add JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 redirects
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Auth Service**:
**File**: [frontend/src/services/authService.js](frontend/src/services/authService.js)

```javascript
export const authService = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    if (response.data.data?.token) {
      localStorage.setItem('authToken', response.data.data.token);
    }
    return response.data;
  },
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (userData) => api.put('/api/auth/profile', userData),
  changePassword: (passwordData) => api.post('/api/auth/change-password', passwordData),
  logout: () => localStorage.removeItem('authToken'),
  isAuthenticated: () => !!localStorage.getItem('authToken'),
};
```

### 4.3 Frontend Components - Data Display

**Authentication Context**:
**File**: [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx)

- Manages global auth state: `user`, `isAuthenticated`, `loading`
- Auto-checks auth on app load
- Provides: `login()`, `register()`, `logout()`, `updateProfile()`, `changePassword()`

**Login Page**:
**File**: [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx)

- Email/password login form
- Calls `authService.login()` → stores token → redirects to dashboard
- "Remember me" functionality via localStorage

**Dashboard Pages**:
- `Dashboard.jsx` - Main analytics view (with data from `/api/dashboard/*` endpoints)
- `AudioUpload.jsx` - File upload interface
- `EvaluationDashboard.jsx` - Evaluation viewing
- `TeacherDashboard.jsx` - Teacher-specific views

---

## 5. DATA FLOW DIAGRAM

```
┌─────────────────┐
│   User Login    │
│    Frontend     │
└────────┬────────┘
         │ email + password
         ▼
┌─────────────────────────────────┐
│  POST /api/auth/login           │
│  Backend: authService.loginUser │
└────────┬────────────────────────┘
         │ Verify password (bcryptjs)
         │ Generate JWT
         ▼
┌──────────────────────────┐
│  JWT Token + User Object │
│  Returned to Frontend    │
└────────┬─────────────────┘
         │ Store token in localStorage
         ▼
┌──────────────────────────────────────┐
│ API Interceptor Adds Token           │
│ All Future Requests Include:         │
│ Authorization: Bearer <token>        │
└────────┬─────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
Protected   Unprotected
Routes      Routes
    │         │
    ▼         ▼
middleware: ─────────► Route Handler
authenticate

Verify JWT ──► Extract user_id, email
              ──► Set req.user
              ──► next()
    │
    ▼
Route Handler
    │
    ├─► maybeCheck ownership
    │   if (file.createdBy !== req.user.email)
    │   return 403
    │
    └─► Query database
        return data
        
    ▼
Backend ──► Frontend Render
Response    Component
(JSON)
```

---

## 6. SECURITY ARCHITECTURE

### 6.1 Password Security

- **Hashing Algorithm**: bcryptjs
- **Salt Rounds**: 10 (computationally expensive)
- **Storage**: Only hashed passwords stored, never plaintext
- **Comparison**: Using `bcryptjs.compare()` for timing-safe comparison

### 6.2 Token Security

- **Type**: JWT (JSON Web Token)
- **Algorithm**: HMAC-SHA256 (HS256)
- **Expiration**: 7 days (default)
- **Storage**: Browser localStorage (vulnerable to XSS, but no HttpOnly alternative visible)
- **Transmission**: Bearer token in Authorization header over HTTPS

### 6.3 Email Handling

- **Normalization**: All email queries use `LOWER(TRIM(email))`
- **Uniqueness**: Enforced at database level (UNIQUE constraint)
- **Case-Insensitive**: Emails treated as case-insensitive

### 6.4 File Access Control

- **Ownership Check**: Compares `file.createdBy` with `req.user.email`
- **Super Admin Override**: Super admins bypass ownership checks
- **Query Verification**: SQL query: `SELECT "createdBy" FROM sound_files WHERE file_id = $1`

### 6.5 API Security

- **CORS**: Configured with whitelist of allowed origins
- **HTTPS Headers**: Helmet middleware for security headers
- **Content-Type**: UTF-8 encoding enforced
- **Error Handling**: Validation of input, proper error codes (401, 403)

### 6.6 Potential Vulnerabilities

⚠️ **Note**: Following are potential areas requiring attention:

1. **localStorage Token Storage**: Vulnerable to XSS attacks (no HttpOnly option found)
2. **Super Admin Implementation**: Incomplete (middleware exists but not fully integrated)
3. **No Token Refresh**: 7-day expiration with no refresh token mechanism
4. **Audit Logging**: Login events tracked but no comprehensive audit trail
5. **Password Reset**: No visible password reset mechanism for forgotten passwords
6. **Rate Limiting**: No apparent rate limiting on login attempts (brute force risk)
7. **CORS**: Multiple origins whitelisted, including subdomains via regex (verify all are trusted)

---

## 7. CONFIGURATION & ENVIRONMENT

### 7.1 Environment Variables Required

```env
# Authentication
JWT_SECRET=your_secret_key_min_32_chars
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=firasah_ai
DB_USER=postgres
DB_PASSWORD=password

# CORS
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Frontend
VITE_API_BASE_URL=http://localhost:5000
```

### 7.2 CORS Allowed Origins

```javascript
[
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://firasah.ai',
  'https://www.firasah.ai',
  'https://tranquil-recreation-production-c46b.up.railway.app',
  // Any firasah.ai subdomain
  // Any *.railway.app subdomain
]
```

---

## 8. KEY FILE REFERENCES

### Backend Files

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Main Entry | [backend/src/index.ts](backend/src/index.ts) | Application setup, route registration |
| Auth Middleware | [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts) | JWT verification, role checks |
| Auth Service | [backend/src/services/authService.ts](backend/src/services/authService.ts) | Login, register, token management |
| Auth Routes | [backend/src/routes/authRoutes.ts](backend/src/routes/authRoutes.ts) | /api/auth/* endpoints |
| Sound Files Service | [backend/src/services/soundFilesService.ts](backend/src/services/soundFilesService.ts) | File CRUD operations |
| Fragment Routes | [backend/src/routes/fragmentRoutes.ts](backend/src/routes/fragmentRoutes.ts) | Fragment endpoints |
| Dashboard Routes | [backend/src/routes/dashboardRoutes.ts](backend/src/routes/dashboardRoutes.ts) | Analytics endpoints |
| Evidences Routes | [backend/src/routes/evidencesRoutes.ts](backend/src/routes/evidencesRoutes.ts) | Evidence endpoints |

### Database Files

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Users Table | [database/create_users_table.sql](database/create_users_table.sql) | User authentication schema |
| Core Tables | [database/firasa_core_tables.sql](database/firasa_core_tables.sql) | Schools, grades, classes, etc. |
| Sound Files | [database/add_tables.sql](database/add_tables.sql) | Sound files and domains tables |
| Role Migration | [database/migrate_add_user_role.sql](database/migrate_add_user_role.sql) | Add role column to users |

### Frontend Files

| Component | File Path | Purpose |
|-----------|-----------|---------|
| API Client | [frontend/src/services/api.js](frontend/src/services/api.js) | Axios instance with JWT interceptor |
| Auth Service | [frontend/src/services/authService.js](frontend/src/services/authService.js) | Auth API wrapper |
| Auth Context | [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx) | Global auth state management |
| Login Page | [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx) | Login UI & logic |
| Dashboard | [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx) | Main dashboard view |

---

## 9. SUMMARY TABLE

| Aspect | Implementation | Status |
|--------|----------------|--------|
| **Authentication** | JWT Bearer tokens | ✅ Implemented |
| **Password Hashing** | bcryptjs (10 rounds) | ✅ Implemented |
| **User Roles** | 'user' and 'super_admin' | ⚠️ Partially implemented |
| **File Ownership** | Email comparison | ✅ Implemented |
| **Super Admin Checks** | Role middleware | ⚠️ Not fully integrated |
| **Token Refresh** | None visible | ❌ Not implemented |
| **Password Reset** | None visible | ❌ Not implemented |
| **Rate Limiting** | None visible | ❌ Not implemented |
| **Audit Logging** | Login events table | ⚠️ Partial |
| **CORS** | Whitelist configured | ✅ Implemented |
| **HTTPS Headers** | Helmet middleware | ✅ Implemented |

---

## 10. RECOMMENDATIONS

1. **Implement Token Refresh**: Add refresh token flow to extend sessions without re-login
2. **Complete Super Admin**: Finalize role integration across all protected routes
3. **Add Password Reset**: Implement forgot password + email verification
4. **Rate Limiting**: Add brute-force protection on login endpoint
5. **HttpOnly Cookies**: Consider moving from localStorage to HttpOnly cookies for token storage
6. **Audit Trail**: Expand login_events to track all sensitive operations
7. **2FA**: Consider adding optional two-factor authentication
8. **CORS Review**: Verify all whitelisted origins are trusted (especially subdomains)
9. **Environment Validation**: Add startup checks for required environment variables
10. **Token Rotation**: Implement automatic token rotation on sensitive operations
