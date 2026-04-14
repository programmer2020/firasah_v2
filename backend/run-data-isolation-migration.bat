@echo off
REM ==============================================================================
REM Data Isolation Migration Script for Windows
REM Applies all necessary migrations for multi-tenant data isolation
REM ==============================================================================

setlocal enabledelayedexpansion

cls
echo ========================================
echo Data Isolation Migration Script
echo ========================================
echo.

REM Colors using built-in Windows methods
echo ⚠️  IMPORTANT WARNINGS:
echo 1. Make sure you have a backup of the database
echo 2. Make sure the database connection is active
echo 3. Make sure all applications are stopped
echo.

REM Check if psql is available
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ❌ psql is not installed or not in PATH
    echo Please install PostgreSQL client tools
    pause
    exit /b 1
)

REM Load environment variables from .env if exists
if exist .env (
    for /f "tokens=*" %%i in ('type .env ^| findstr /v "^#"') do (
        set "%%i"
    )
)

REM Set database credentials with defaults
set "DB_USER=%DB_USER:x=postgres%"
set "DB_HOST=%DB_HOST:x=localhost%"
set "DB_PORT=%DB_PORT:x=5432%"
set "DB_NAME=%DB_NAME:x=firasah_ai%"

echo Database Information:
echo Host: %DB_HOST%
echo Port: %DB_PORT%
echo Database: %DB_NAME%
echo User: %DB_USER%
echo.

REM Step 1: Apply columns migration
echo Step 1: Adding created_by columns...
echo Running: add_data_isolation_columns.sql
psql -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -f db-migrations\add_data_isolation_columns.sql

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to add columns
    pause
    exit /b 1
)

echo ✅ Columns added successfully
echo.

REM Step 2: Apply triggers migration
echo Step 2: Adding triggers for automatic updates...
echo Running: add_data_isolation_triggers.sql
psql -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -f db-migrations\add_data_isolation_triggers.sql

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to add triggers
    pause
    exit /b 1
)

echo ✅ Triggers added successfully
echo.

REM Step 3: Verify the setup
echo Step 3: Verifying setup...
echo.

echo ✓ Columns added:
psql -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name = 'created_by' ORDER BY table_name;"

echo.
echo ✓ Triggers added:
psql -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -c "SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE event_object_table IN ('sound_files', 'lecture', 'fragments', 'evidences') ORDER BY event_object_table;"

echo.
echo ========================================
echo ✅ Data Isolation Migration Completed!
echo ========================================
echo.

echo Next Steps:
echo 1. Restart Backend: npm start
echo 2. Test endpoints to verify isolation
echo 3. Watch logs for errors
echo.

pause
