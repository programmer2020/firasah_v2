# Firasah AI - Complete Setup Guide

This guide will help you set up and run the complete Firasah AI application (Backend + Frontend).

## Project Overview

Firasah AI consists of two main parts:
- **Backend**: Node.js + Express + PostgreSQL (runs on port 5000)
- **Frontend**: React + Vite + React Router (runs on port 5173)

## Prerequisites

### System Requirements
- **Operating System**: Windows, macOS, or Linux
- **Node.js**: Version 20.17.0 or higher
- **npm**: Version 10.8.2 or higher
- **PostgreSQL**: Version 12 or higher

### Installation Verification

Check if you have everything installed:

```bash
# Check Node.js version
node --version
# Expected: v20.17.0 or higher

# Check npm version
npm --version
# Expected: 10.8.2 or higher
```

## Project Structure

```
d:\Projects\_Firasah-Ai-V2.0.0.1
├── backend/
│   ├── src/
│   ├── dist/
│   ├── database/
│   ├── package.json
│   ├── .env
│   └── ...
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
└── README.md
```

## Step 1: Backend Setup

### 1.1 Navigate to Backend Directory

```bash
cd backend
```

### 1.2 Install Backend Dependencies

```bash
npm install
```

This installs:
- express: Web framework
- pg: PostgreSQL client
- jsonwebtoken: JWT authentication
- bcryptjs: Password hashing
- dotenv: Environment variables
- swagger-ui-express & swagger-jsdoc: API documentation
- helmet: Security headers
- cors: Cross-origin requests

### 1.3 Configure PostgreSQL

1. **Install PostgreSQL** (if not already installed)
   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. **Start PostgreSQL Service**
   - Windows: Use pgAdmin or Services app
   - macOS: `brew services start postgresql`
   - Linux: `sudo systemctl start postgresql`

3. **Create Database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE firasah_ai;
   \q  # Exit
   ```

4. **Run Database Schema**
   ```bash
   # From backend directory
   psql -U postgres -d firasah_ai -f database/schema.sql
   ```

### 1.4 Configure Environment Variables

Edit `.env` file in backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=firasah_ai

# JWT Configuration
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRE=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Server Port
PORT=5000
NODE_ENV=development
```

### 1.5 Build Backend

```bash
npm run build
```

### 1.6 Start Backend Server

```bash
npm run dev
```

**Expected Output:**
```
Server is running on port 5000
Database connected successfully
Visit http://localhost:5000/api-docs for Swagger documentation
```

## Step 2: Frontend Setup

### 2.1 Open New Terminal Window

Keep the backend running in the first terminal and open a new one.

### 2.2 Navigate to Frontend Directory

```bash
cd frontend
```

### 2.3 Install Frontend Dependencies

```bash
npm install
```

This installs:
- react: UI library
- react-router-dom: Client-side routing
- axios: HTTP client
- And build tools (Vite, ESLint)

### 2.4 Configure Frontend

The frontend is pre-configured to connect to `http://localhost:5000`.

If you need to change the API URL, edit `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### 2.5 Start Frontend Development Server

```bash
npm run dev
```

**Expected Output:**
```
  VITE v8.0.0-beta.13  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## Step 3: Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

### First Time Setup

1. **Register a New Account**
   - Click "Register here" link
   - Fill in: Name, Email, Password
   - Click "Register"

2. **Login**
   - Use your credentials
   - You'll be redirected to Dashboard

3. **Explore Dashboard**
   - View quick stats
   - Access data management pages

## Step 4: Testing Authentication

### Register Test User

1. Go to `http://localhost:5173/register`
2. Fill in the form:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
3. Click Register
4. You'll be redirected to login

### Login

1. Go to `http://localhost:5173/login`
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
3. Click Login
4. You should see the Dashboard

### Verify Backend

Check Swagger API documentation:
```
http://localhost:5000/api-docs
```

## Common Commands

### Backend Commands
```bash
# Development mode with auto-reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test
```

### Frontend Commands
```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Troubleshooting

### Backend Won't Start

**Error: "connect ECONNREFUSED"**
- PostgreSQL is not running
- Solution: Start PostgreSQL service

**Error: "Port 5000 already in use"**
- Another process is using port 5000
- Solution: Kill process or use different port

**Error: "Database connection failed"**
- Wrong credentials in .env
- Schema not loaded
- Solution: Check .env and run schema.sql again

### Frontend Won't Load

**Error: "Cannot GET /api/..."**
- Backend is not running
- Solution: Start backend server

**Error: "CORS Error"**
- Backend CORS configuration issue
- Solution: Check CORS_ORIGIN in .env

**Error: "Port 5173 already in use"**
- Another process is using port 5173
- Solution: Kill process or use different port

### Login Issues

**"Invalid credentials"**
- User doesn't exist
- Wrong password
- Solution: Register new account or verify credentials

**"Unauthorized" on protected routes**
- JWT token expired
- Solution: Re-login

## API Testing

### Using Swagger UI

1. Navigate to: `http://localhost:5000/api-docs`
2. All endpoints are documented with examples
3. Click "Try it out" to test endpoints
4. Use the provided JWT token for protected routes

### Using Postman

1. Import `API.rest` file from backend folder
2. Or manually create requests with:
   - Method: POST/GET/PUT/DELETE
   - URL: http://localhost:5000/api/...
   - Headers: Content-Type: application/json
   - Auth: Bearer {token}

### Using cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","name":"User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get Profile (with token)
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Production Deployment

### Backend Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Set environment variables on server

3. Start application:
   ```bash
   npm start
   ```

### Frontend Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy `dist/` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages
   - Your own web server

## Stopping Services

### Stop Backend
Press `Ctrl + C` in backend terminal

### Stop Frontend
Press `Ctrl + C` in frontend terminal

### Stop PostgreSQL
```bash
# Windows: Use Services app
# macOS: brew services stop postgresql
# Linux: sudo systemctl stop postgresql
```

## Database Management

### View Database Tables

```bash
# Connect to database
psql -U postgres -d firasah_ai

# List tables
\dt

# View table structure
\d table_name

# Exit
\q
```

### Backup Database

```bash
# Create backup
pg_dump -U postgres -d firasah_ai > backup.sql

# Restore backup
psql -U postgres -d firasah_ai < backup.sql
```

## Performance Tips

1. **Enable Caching**: Configure Redis for session storage
2. **Database Indexes**: Add indexes on frequently queried columns
3. **Frontend Optimization**: Use lazy loading for routes
4. **API Response Caching**: Add caching headers
5. **Monitor Performance**: Use Chrome DevTools Performance tab

## Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use HTTPS in production
- [ ] Set strong database passwords
- [ ] Enable CORS only for trusted origins
- [ ] Keep dependencies updated
- [ ] Run security audit: `npm audit`
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting on API
- [ ] Use helmet for security headers

## Next Steps

1. Create additional data management endpoints in backend
2. Test all API endpoints
3. Deploy to production
4. Configure custom domain
5. Set up monitoring and logging
6. Add additional features based on requirements

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs: See console output
3. Check frontend browser console: F12 → Console
4. Review PostgreSQL logs

## Documentation Files

- `backend/FULL_DOCUMENTATION.md` - Complete API documentation
- `backend/SWAGGER_GUIDE.md` - Swagger/OpenAPI setup guide
- `backend/POSTGRESQL_SETUP.md` - PostgreSQL setup guide
- `frontend/FRONTEND_README.md` - Frontend setup and features

---

**Version**: 2.0.0.1  
**Last Updated**: March 2026
