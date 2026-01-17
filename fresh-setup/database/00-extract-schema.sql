-- =============================================
-- OJO SCHEMA EXTRACTION QUERIES
-- File: 00-extract-schema.sql
-- Run these to backup schema from existing DB
-- =============================================

-- =============================================
-- 1. GET ALL TABLE DEFINITIONS
-- =============================================
-- Shows all columns, types, and defaults for each table

SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =============================================
-- 2. GET ALL ROW LEVEL SECURITY POLICIES
-- =============================================
-- Shows all RLS policies configured on tables

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- 3. GET ALL FOREIGN KEY RELATIONSHIPS
-- =============================================
-- Shows all foreign keys and their delete rules

SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================
-- 4. GET ALL INDEXES
-- =============================================
-- Shows all indexes and their definitions

SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =============================================
-- 5. GET ALL UNIQUE CONSTRAINTS
-- =============================================
-- Shows all unique constraints

SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =============================================
-- 6. GET REALTIME ENABLED TABLES
-- =============================================
-- Shows which tables have realtime enabled

SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- =============================================
-- 7. GET TABLE ROW COUNTS
-- =============================================
-- Shows approximate row counts for each table

SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- =============================================
-- 8. GET STORAGE BUCKETS
-- =============================================
-- Shows all storage buckets and their settings

SELECT
    id,
    name,
    public,
    created_at
FROM storage.buckets
ORDER BY name;

-- =============================================
-- 9. GET STORAGE POLICIES
-- =============================================
-- Shows all storage object policies

SELECT
    policyname,
    tablename,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY policyname;

-- =============================================
-- USAGE INSTRUCTIONS
-- =============================================
--
-- 1. Go to Supabase SQL Editor
-- 2. Run each section separately
-- 3. Export results as CSV or copy to spreadsheet
-- 4. Use to recreate schema in new project
--
-- =============================================
