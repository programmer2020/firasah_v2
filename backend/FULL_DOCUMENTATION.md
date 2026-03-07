# Firasah AI v2 - Database & API Documentation

## 🚀 Quick Start

### 1. Setup Database

```sql
-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for email lookups
CREATE INDEX idx_users_email ON users(email);
```

### 2. Environment Variables

Copy `.env` file and configure:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=firasah_ai_db

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

CORS_ORIGIN=http://localhost:3000
```

### 3. Install & Run

```bash
npm install
npm run build
npm start

# Development with auto-reload
npm run dev
```

---

## 📁 Project Structure

```
src/
├── config/          # Configuration files
│   └── database.ts  # PostgreSQL connection pool
├── middleware/      # Express middleware
│   └── auth.ts      # JWT authentication middleware
├── helpers/         # Helper functions
│   └── database.ts  # Database utility functions
├── services/        # Business logic
│   └── authService.ts # Authentication service
├── routes/          # API routes
│   ├── authRoutes.ts   # Auth endpoints
│   └── healthRoutes.ts # Health check endpoints
└── index.ts         # Main application file
```

---

## 🔐 Authentication Flow

### Register User

**Request:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "User Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "created_at": "2024-03-06T12:00:00.000Z",
    "updated_at": "2024-03-06T12:00:00.000Z"
  }
}
```

### Login User

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "created_at": "2024-03-06T12:00:00.000Z",
      "updated_at": "2024-03-06T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Profile (Protected)

**Request:**
```bash
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "created_at": "2024-03-06T12:00:00.000Z",
    "updated_at": "2024-03-06T12:00:00.000Z"
  }
}
```

### Update Profile (Protected)

**Request:**
```bash
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "email": "newemail@example.com"
}
```

### Change Password (Protected)

**Request:**
```bash
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "current_password",
  "newPassword": "new_password"
}
```

---

## 🛠️ Database Helper Functions

### executeQuery
Execute raw SQL query

```typescript
import { executeQuery } from './helpers/database';

const result = await executeQuery(
  'SELECT * FROM users WHERE id = $1',
  [1]
);
```

### getOne
Get single record

```typescript
import { getOne } from './helpers/database';

const user = await getOne(
  'SELECT * FROM users WHERE email = $1',
  ['user@example.com']
);
```

### getMany
Get multiple records

```typescript
import { getMany } from './helpers/database';

const users = await getMany('SELECT * FROM users LIMIT 10');
```

### insert
Insert new record

```typescript
import { insert } from './helpers/database';

const user = await insert('users', {
  email: 'new@example.com',
  password: 'hashed_password',
  name: 'New User',
  created_at: new Date(),
  updated_at: new Date(),
});
```

### update
Update existing record

```typescript
import { update } from './helpers/database';

const updated = await update(
  'users',
  { name: 'Updated Name' },
  'id = $1',
  [1]
);
```

### deleteRecord
Delete record

```typescript
import { deleteRecord } from './helpers/database';

const deleted = await deleteRecord(
  'users',
  'id = $1',
  [1]
);
```

### getCount
Count records

```typescript
import { getCount } from './helpers/database';

const count = await getCount('users');
const activeCount = await getCount(
  'users',
  'status = $1',
  ['active']
);
```

### transaction
Execute transaction

```typescript
import { transaction } from './helpers/database';

const result = await transaction(async (client) => {
  await client.query('INSERT INTO logs ...');
  await client.query('UPDATE users ...');
  return { success: true };
});
```

### paginate
Get paginated results

```typescript
import { paginate } from './helpers/database';

const result = await paginate(
  'SELECT * FROM users',
  2,  // page
  10  // limit per page
);

// Result:
// {
//   data: [...],
//   pagination: {
//     page: 2,
//     limit: 10,
//     total: 50,
//     pages: 5
//   }
// }
```

---

## 🔐 Authentication Service Functions

### hashPassword
Hash password with bcrypt

```typescript
import { hashPassword } from './services/authService';

const hashed = await hashPassword('plain_password');
```

### comparePassword
Compare plain password with hash

```typescript
import { comparePassword } from './services/authService';

const isValid = await comparePassword('plain_password', hashed);
```

### generateToken
Create JWT token

```typescript
import { generateToken } from './services/authService';

const token = generateToken({ id: 1, email: 'user@example.com' });
```

### verifyToken
Verify JWT token

```typescript
import { verifyToken } from './services/authService';

const payload = verifyToken(token);
// Returns payload or null if invalid
```

### registerUser
Register new user

```typescript
import { registerUser } from './services/authService';

const user = await registerUser({
  email: 'user@example.com',
  password: 'secure_password',
  name: 'User Name'
});
```

### loginUser
Login user and get token

```typescript
import { loginUser } from './services/authService';

const { user, token } = await loginUser(
  'user@example.com',
  'password'
);
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| GET | / | Health Check | No |
| GET | /health | Detailed Status | No |
| POST | /api/auth/register | Register User | No |
| POST | /api/auth/login | Login User | No |
| GET | /api/auth/profile | Get Profile | Yes |
| PUT | /api/auth/profile | Update Profile | Yes |
| POST | /api/auth/change-password | Change Password | Yes |

---

## 🧪 Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Profile (with token)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📋 Error Handling

All endpoints return a standard response format:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Additional error details"
}
```

---

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` file
2. **JWT Secret**: Use strong, random secret key
3. **Password Hashing**: Uses bcryptjs with 10 salt rounds
4. **CORS**: Configure for your domain
5. **Helmet**: Security headers enabled
6. **Input Validation**: Validate all inputs before processing
7. **Error Handling**: Don't expose sensitive info in errors

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [CORS Documentation](https://github.com/expressjs/cors)
- [Helmet Documentation](https://github.com/helmetjs/helmet)

---

## 🐛 Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Ensure database exists

### JWT Token Expired
- Get a new token by logging in again
- Adjust JWT_EXPIRE in `.env` if needed

### CORS Issues
- Update CORS_ORIGIN in `.env`
- Check browser console for details

---

**Version**: 2.0.0.1  
**Last Updated**: March 6, 2026
