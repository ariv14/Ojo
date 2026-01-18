-- =============================================
-- Ojo USER SEARCH ENHANCEMENTS
-- File: ojo_user_search_enhancements.sql
--
-- Performance indexes for user discovery and admin features
-- Run this file in Supabase SQL Editor for existing installations
-- =============================================

-- =============================================
-- USER SEARCH & DISCOVERY INDEXES
-- =============================================

-- Index for name search (Discover page, Admin user search)
-- Speeds up: .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);

-- Index for user listing by join date (Discover page, Admin user list)
-- Speeds up: .order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Index for activity-based sorting (Admin user list "Last Active" sort)
-- Speeds up: .order('last_seen_at', { ascending: false, nullsFirst: false })
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at DESC NULLS LAST);

-- Index for status filtering (Admin stats, Discover page active filter)
-- Speeds up: .eq('status', 'active'), .eq('status', 'banned'), etc.
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- =============================================
-- VERIFICATION
-- =============================================
-- Run this to verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';
--
-- Expected indexes after running:
-- - idx_users_first_name
-- - idx_users_last_name
-- - idx_users_created_at
-- - idx_users_last_seen_at
-- - idx_users_status
-- =============================================
