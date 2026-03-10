# Database Migration Guide: Local → Neon Cloud

هذا الدليل يشرح كيفية نقل جميع البيانات من قاعدة البيانات المحلية إلى خادم Neon Cloud.

**This guide explains how to migrate all data from your local database to the Neon Cloud server.**

---

## 🎯 Migration Overview

### Source (Local Database)
- **Host:** localhost
- **Port:** 5432
- **Database:** firasah_ai_db
- **User:** postgres

### Destination (Neon Cloud Database)
- **Host:** ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech
- **Port:** 5432
- **Database:** neondb
- **User:** neondb_owner
- **Region:** eastus2 (Azure)

---

## 📋 Tables to be Migrated

The migration includes the following tables with all relationships and data:

```
┌─ Users & Authentication
│  └─ users
│
├─ School Structure
│  ├─ schools
│  ├─ grades
│  ├─ sections
│  ├─ classes
│  ├─ teachers
│  └─ subjects
│
├─ Schedule Management
│  ├─ section_time_slots
│  └─ class_schedule
│
└─ Evaluation & Analytics
   ├─ kpi_domains (8 teaching domains)
   ├─ kpis (Key Performance Indicators)
   ├─ sound_files (Audio files)
   ├─ speech (Transcriptions)
   ├─ evidences (Evidence records)
   └─ evaluations (Evaluation scores)
```

---

## 🚀 Method 1: Using Node.js Client (Recommended for Development)

**File:** `migrate-to-neon.mjs`

### Advantages:
✅ Easy to debug and modify  
✅ Works on Windows, Mac, Linux  
✅ Does not require PostgreSQL tools to be installed  
✅ Provides detailed progress information  
✅ Can handle errors gracefully  

### Prerequisites:
- Node.js installed
- Access to local PostgreSQL database
- Network connectivity to Neon endpoint

### Usage:

```bash
# Navigate to backend directory
cd backend

# Run the migration
node migrate-to-neon.mjs
```

### Output Example:
```
╔════════════════════════════════════════╗
║    STARTING DATABASE MIGRATION       ║
╚════════════════════════════════════════╝

STEP 1: EXTRACTING DATA FROM LOCAL DB
═══════════════════════════════════════
📥 Extracting data from users...
   ✅ Extracted 5 records from users
📥 Extracting data from schools...
   ✅ Extracted 12 records from schools
...
[continues for all tables]

STEP 2: SETTING UP NEON SCHEMA
═══════════════════════════════════════
🔧 Setting up Neon database schema...
✅ Schema created successfully on Neon

STEP 3: INSERTING DATA TO NEON DB
═══════════════════════════════════════
📤 Inserting records into users...
   ✅ Successfully inserted data into users
...

STEP 4: VERIFYING DATA TRANSFER
═══════════════════════════════════════
✅ users: 5 records (expected: 5)
✅ schools: 12 records (expected: 12)
...

╔════════════════════════════════════════╗
║    MIGRATION COMPLETED SUCCESSFULLY  ║
╚════════════════════════════════════════╝
```

---

## 🗄️ Method 2: Using PostgreSQL CLI Tools (Recommended for Large Databases)

**File:** `migrate-pg-dump.mjs`

### Advantages:
✅ More reliable for large databases  
✅ Preserves exact data types and sequences  
✅ Faster transfer  
✅ Industry-standard method  
✅ Includes schema, data, and sequences  

### Prerequisites:
- PostgreSQL command-line tools (`pg_dump`, `psql`) must be installed:

**Windows:**
```bash
# Download PostgreSQL from https://www.postgresql.org/download/windows/
# During installation, check "Command Line Tools"
# Or use chocolatey:
choco install postgresql
```

**macOS:**
```bash
# Using Homebrew:
brew install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql-client
```

### Verify Installation:
```bash
pg_dump --version
psql --version
```

### Usage:

```bash
# Navigate to backend directory
cd backend

# Run the pg_dump migration
node migrate-pg-dump.mjs
```

### What it does:
1. **Dumps** the entire local database to a SQL file
2. **Restores** the SQL file to Neon database
3. **Verifies** the migration by checking table counts

---

## 🛠️ Manual Migration (Alternative Method)

If the automated scripts fail, you can perform manual migration:

### Step 1: Export Database
```bash
# Linux/Mac
pg_dump --host localhost --port 5432 --username postgres --password firasah_ai_db > backup.sql

# Windows (PowerShell)
$env:PGPASSWORD="123456"; pg_dump --host localhost --port 5432 --username postgres firasah_ai_db > backup.sql
```

### Step 2: Import to Neon
```bash
# Linux/Mac
psql --host ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech --port 5432 --username neondb_owner --password neondb < backup.sql

# Windows (PowerShell)
$env:PGPASSWORD="npg_o4iEtH5mkKIz"; psql --host ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech --port 5432 --username neondb_owner neondb -f backup.sql
```

### Step 3: Verify
```bash
psql --host ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech --port 5432 --username neondb_owner --password neondb

# In psql prompt, run:
\dt  -- List all tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM schools;
```

---

## ⚙️ Environment Configuration

After migration, update your `.env` file in the backend:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration (Neon Cloud)
DB_HOST=ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech
DB_PORT=5432
DB_USER=neondb_owner
DB_PASSWORD=npg_o4iEtH5mkKIz
DB_NAME=neondb
DB_SSL=true

# Keep other configurations as is
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
OPENAI_API_KEY=sk-proj-xxx...
```

---

## 🔒 Security Best Practices

1. **Change Password After Migration:**
   ```sql
   ALTER USER neondb_owner WITH PASSWORD 'new_strong_password';
   ```

2. **Update Environment Variables:**
   - Never commit `.env` to Git
   - Use `.env.local` for local development
   - Store sensitive values in platform secrets

3. **Test Connection:**
   ```javascript
   import pkg from 'pg';
   const { Client } = pkg;

   const client = new Client({
     host: 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
     port: 5432,
     user: 'neondb_owner',
     password: 'npg_o4iEtH5mkKIz',
     database: 'neondb',
     ssl: true
   });

   await client.connect();
   console.log('✅ Connected to Neon!');
   await client.end();
   ```

---

## 🐛 Troubleshooting

### Error: "Could not connect to local database"
```bash
# Check if PostgreSQL is running
# Windows:
Get-Service PostgreSQL
# or press Windows + R, then: services.msc

# Linux/Mac:
brew services list

# Verify connection details in .env
```

### Error: "Could not connect to Neon database"
```bash
# Check credentials:
# Host: ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech
# Port: 5432
# Database: neondb
# User: neondb_owner
# Password: npg_o4iEtH5mkKIz

# Tests from PostgreSQL client:
psql -h ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech -U neondb_owner -d neondb
```

### Error: "Foreign key constraint violation"
```bash
# The migration script handles this, but if manual:
# Temporarily disable constraints:
SET CONSTRAINTS ALL DEFERRED;
```

### Error: "pg_dump not found"
```bash
# Install PostgreSQL CLI tools
# Check installation path:
which pg_dump  # Linux/Mac
where pg_dump  # Windows (PowerShell)

# Add to PATH if needed (Windows):
# C:\Program Files\PostgreSQL\15\bin
```

### Slow Migration for Large Databases
```bash
# Use parallel jobs (pg_dump only):
pg_dump -j 4 --host localhost --username postgres firasah_ai_db > backup.sql

# Increase buffer size:
node --max-old-space-size=4096 migrate-to-neon.mjs
```

---

## ✅ Verification Checklist

After migration, verify all data:

```bash
# Connect to Neon database
psql -h ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech -U neondb_owner -d neondb

# In psql prompt:

-- Check all tables exist
\dt

-- Verify row counts (adjust table names as needed)
SELECT COUNT(*) as users FROM users;
SELECT COUNT(*) as schools FROM schools;
SELECT COUNT(*) as teachers FROM teachers;
SELECT COUNT(*) as classes FROM classes;
SELECT COUNT(*) as evaluations FROM evaluations;
SELECT COUNT(*) as evidences FROM evidences;

-- Check relationships
SELECT * FROM schools LIMIT 1;
SELECT * FROM teachers WHERE school_id = 1 LIMIT 1;

-- Verify indexes
\di

-- Exit
\q
```

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Run migration (Node method) | `node migrate-to-neon.mjs` |
| Run migration (pg_dump method) | `node migrate-pg-dump.mjs` |
| Connect to Neon in psql | `psql -h ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech -U neondb_owner -d neondb` |
| Backup local database | `pg_dump -U postgres firasah_ai_db > backup.sql` |
| List all tables | `\dt` (in psql) |
| Get row count | `SELECT COUNT(*) FROM table_name;` |

---

## 📝 Notes

- ⏱️ Migration time depends on database size (typically 1-10 minutes)
- 🔄 Can be run multiple times (safe - uses `ON CONFLICT DO NOTHING`)
- 🔐 All connections use SSL encryption to Neon
- 📊 Both methods preserve data integrity and relationships
- 💾 Keeps local database intact (non-destructive)

---

## ✨ After Migration

1. Test your application with Neon:
   ```bash
   npm run dev
   ```

2. Verify API endpoints work:
   ```bash
   curl http://localhost:5000/api/health
   ```

3. Run tests if available:
   ```bash
   npm test
   ```

4. Archive the local backup for 30 days before deletion

---

**Last Updated:** March 10, 2026  
**Firasah AI v2.0.0.2**
