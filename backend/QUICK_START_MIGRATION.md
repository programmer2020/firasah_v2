# 🚀 Database Migration to Neon - Quick Start

تم إنشاء ثلاث ملفات لنقل البيانات من السيرفر المحلي إلى Neon Cloud.

**Three migration files have been created for data transfer from local to Neon Cloud.**

---

## 📁 Files Created

### 1. **validate-migration.mjs** ✅
   - **Purpose:** Pre-migration validation
   - **Checks:** Database connections, scripts, prerequisites
   - **When to use:** First, before running migration
   
   ```bash
   node validate-migration.mjs
   ```

### 2. **migrate-to-neon.mjs** 🔵 (RECOMMENDED FOR FIRST TIME)
   - **Purpose:** Full migration using Node.js
   - **Advantage:** No additional tools needed, detailed progress logging
   - **Time:** 1-10 minutes depending on data size
   - **Recommended:** For development and smaller databases
   
   ```bash
   node migrate-to-neon.mjs
   ```

### 3. **migrate-pg-dump.mjs** 🟢 (FOR LARGE DATABASES)
   - **Purpose:** Migration using pg_dump (PostgreSQL native tool)
   - **Advantage:** Industry-standard, faster for large databases
   - **Requires:** PostgreSQL CLI tools installed
   - **Recommended:** For production and large datasets
   
   ```bash
   node migrate-pg-dump.mjs
   ```

### 4. **NEON_MIGRATION_GUIDE.md** 📖
   - **Purpose:** Complete technical documentation
   - **Contains:** Detailed steps, troubleshooting, manual methods

---

## 🎯 Quick Start (3 Easy Steps)

### Step 1: Validate Everything is Ready
```bash
cd backend
node validate-migration.mjs
```

**Expected output:**
```
✅ READY FOR MIGRATION!

Next steps:
   1. Backup your local database
   2. Run: node migrate-to-neon.mjs
   3. Verify migration
   4. Update .env with Neon credentials
```

### Step 2: Run Migration
```bash
node migrate-to-neon.mjs
```

**The script will:**
- ✅ Extract all data from local database
- ✅ Connect to Neon cloud
- ✅ Create all tables and relationships
- ✅ Insert all data
- ✅ Verify data transfer

### Step 3: Update Environment
Edit `backend/.env`:
```env
# Change from:
DB_HOST=localhost

# To:
DB_HOST=ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech
DB_PORT=5432
DB_USER=neondb_owner
DB_PASSWORD=npg_o4iEtH5mkKIz
DB_NAME=neondb
DB_SSL=true
```

---

## 📊 Database Details

### Tables Being Migrated (15 tables):
```
✅ users (authentication)
✅ schools (school information)
✅ grades (academic levels)
✅ sections (class sections A, B, C)
✅ classes (grade+section combinations)
✅ subjects (school subjects)
✅ teachers (teacher information)
✅ section_time_slots (schedule slots)
✅ class_schedule (subject teacher assignments)
✅ kpi_domains (8 teaching evaluation domains)
✅ kpis (key performance indicators)
✅ sound_files (audio recordings)
✅ speech (transcriptions)
✅ evidences (evidence records)
✅ evaluations (evaluation scores)
```

### Data Being Migrated:
- **From:** localhost:5432 / firasah_ai_db
- **To:** ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech / neondb
- **Includes:** All tables, relationships, indexes, data

---

## ⚡ Which Migration Method Should I Use?

### Use **migrate-to-neon.mjs** if:
- ✅ First time migrating
- ✅ Database size < 500 MB
- ✅ Don't have PostgreSQL CLI tools installed
- ✅ Using Windows and want easy setup
- ✅ Want detailed error messages

### Use **migrate-pg-dump.mjs** if:
- ✅ Database size > 500 MB
- ✅ Need fastest migration
- ✅ PostgreSQL tools are installed
- ✅ Migrating production database
- ✅ Want industry-standard method

---

## 🔍 Monitoring Migration Progress

### During Migration:
```bash
# The script shows real-time progress:
📥 Extracting data from users...
   ✅ Extracted 250 records from users

📤 Inserting 250 records into users...
   ✅ Successfully inserted data into users

✅ users: 250 records (expected: 250)
```

### After Migration:
```bash
# Connect to Neon to verify:
psql -h ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech \
     -U neondb_owner \
     -d neondb

# In psql prompt:
SELECT COUNT(*) FROM users;      -- Should show number of users
SELECT COUNT(*) FROM schools;    -- Should show number of schools
\dt                              -- List all tables

# Exit:
\q
```

---

## 🐛 Troubleshooting Quick Tips

### "Connection refused"
```bash
# Make sure local PostgreSQL is running:
# Windows: Services → PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### "Password authentication failed"
```bash
# Verify .env credentials:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456  # Your local password
DB_NAME=firasah_ai_db
```

### "Could not find table"
```bash
# Make sure local database exists:
psql -h localhost -U postgres -d postgres -c "\l"
# Should show "firasah_ai_db" in the list
```

### Migration is slow
```bash
# Increase Node memory:
node --max-old-space-size=4096 migrate-to-neon.mjs

# Or use pg_dump method:
node migrate-pg-dump.mjs  # Generally faster
```

---

## ✅ Verification Checklist

After migration completes:

- [ ] Run validation script again: `node validate-migration.mjs`
- [ ] Check row counts match local database
- [ ] Connect to Neon and verify tables exist
- [ ] Update `.env` file with Neon credentials
- [ ] Restart backend server
- [ ] Test API endpoints
- [ ] Frontend still works
- [ ] Create backup of local database

---

## 🔒 Important Security Notes

1. **Never commit passwords to Git:**
   ```bash
   # .gitignore should contain:
   .env
   .env.local
   *.sql
   backup.sql
   ```

2. **Change Neon password after migration:**
   ```sql
   ALTER USER neondb_owner WITH PASSWORD 'your_new_strong_password';
   ```

3. **Keep local database for 30 days** before deletion

---

## 📈 Performance Tips

### Before Migration:
```bash
# Ensure local database is optimized:
psql -h localhost -U postgres -d firasah_ai_db
ANALYZE;  -- Optimize query planner statistics
VACUUM;   -- Clean up dead tuples
\q
```

### For Large Databases:
```bash
# Use pg_dump method (faster)
node migrate-pg-dump.mjs

# Or increase Node memory
node --max-old-space-size=8192 migrate-to-neon.mjs
```

---

## 📞 Command Reference

| Task | Command |
|------|---------|
| Validate setup | `node validate-migration.mjs` |
| Migrate (Node) | `node migrate-to-neon.mjs` |
| Migrate (pg_dump) | `node migrate-pg-dump.mjs` |
| Connect to Neon | `psql -h ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech -U neondb_owner -d neondb` |
| Get table count | `SELECT COUNT(*) FROM table_name;` |
| List all tables | `\dt` (in psql) |
| Backup local | `pg_dump -U postgres firasah_ai_db > backup.sql` |

---

## 🎓 Learning Resources

- **Neon Documentation:** https://neon.tech/docs
- **PostgreSQL Migration:** https://www.postgresql.org/docs/current/backup-dump.html
- **Node.js pg module:** https://node-postgres.com/

---

## 📋 Support

If you encounter issues:

1. Check **NEON_MIGRATION_GUIDE.md** for detailed troubleshooting
2. Verify databases are accessible: `validate-migration.mjs`
3. Check PostgreSQL logs for errors
4. Ensure network connectivity to Neon endpoint

---

**Status:** ✅ Ready to Migrate  
**Created:** March 10, 2026  
**Firasah AI v2.0.0.2**

---

### 🎯 Next Step:
```bash
node validate-migration.mjs
```
