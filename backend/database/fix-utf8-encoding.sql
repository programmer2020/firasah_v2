-- ============================================================
-- Fix UTF-8 Encoding for Arabic and other languages
-- ============================================================

-- Update database to use UTF-8 encoding
-- Note: This requires admin privileges
-- Run this with:** psql -U postgres -d firasah_ai_db -f fix-utf8-encoding.sql

-- Option 1: If database is empty, you can drop and recreate
-- DROP DATABASE IF EXISTS firasah_ai_db;
-- CREATE DATABASE firasah_ai_db WITH ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';

-- Option 2: Alter existing tables to use proper encoding
-- Convert all text columns to use UTF-8

-- Users table
ALTER TABLE users ALTER COLUMN name TYPE CHARACTER VARYING(255) COLLATE "C";

-- Schools table  
ALTER TABLE schools ALTER COLUMN school_name TYPE CHARACTER VARYING(200) COLLATE "C";
ALTER TABLE schools ALTER COLUMN city TYPE CHARACTER VARYING(100) COLLATE "C";
ALTER TABLE schools ALTER COLUMN country TYPE CHARACTER VARYING(100) COLLATE "C";

-- Grades table
ALTER TABLE grades ALTER COLUMN grade_name TYPE CHARACTER VARYING(50) COLLATE "C";

-- Sections table
ALTER TABLE sections ALTER COLUMN section_name TYPE CHARACTER VARYING(10) COLLATE "C";

-- Classes table
ALTER TABLE classes ALTER COLUMN class_name TYPE CHARACTER VARYING(100) COLLATE "C";

-- Sound files table
ALTER TABLE sound_files ALTER COLUMN filename TYPE CHARACTER VARYING(255) COLLATE "C";
ALTER TABLE sound_files ALTER COLUMN filepath TYPE CHARACTER VARYING(500) COLLATE "C";
ALTER TABLE sound_files ALTER COLUMN createdBy TYPE CHARACTER VARYING(255) COLLATE "C";
ALTER TABLE sound_files ALTER COLUMN note TYPE TEXT COLLATE "C";

-- KPIs table
ALTER TABLE kpis ALTER COLUMN kpi_name TYPE CHARACTER VARYING(255) COLLATE "C";
ALTER TABLE kpis ALTER COLUMN createdBy TYPE CHARACTER VARYING(255) COLLATE "C";
ALTER TABLE kpis ALTER COLUMN note TYPE TEXT COLLATE "C";

-- Evidences table
ALTER TABLE evidences ALTER COLUMN evidence_txt TYPE TEXT COLLATE "C";

-- Ensure frontend sends UTF-8
-- Verify with: SELECT name FROM pg_database WHERE datname = 'firasah_ai_db';
