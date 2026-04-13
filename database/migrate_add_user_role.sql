-- Migration: Add role column to users table
-- Roles: 'user' (default), 'super_admin'

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
