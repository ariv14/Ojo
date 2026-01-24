-- Feed Query Optimization
-- Adds composite index for main feed query (is_hidden + created_at ordering)
-- Run in Supabase SQL Editor for existing installations

-- This composite index optimizes the main feed query which filters by
-- is_hidden = false and orders by created_at DESC. Without this index,
-- PostgreSQL must perform a separate sort operation after filtering.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_hidden_created
ON posts(is_hidden, created_at DESC);
