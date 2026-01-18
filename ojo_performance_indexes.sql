-- =============================================
-- Ojo PERFORMANCE OPTIMIZATION INDEXES
-- File: ojo_performance_indexes.sql
--
-- Migration file to add missing indexes and RPC
-- functions for improved query performance.
-- Run this in Supabase SQL Editor for existing installs.
-- =============================================

-- =============================================
-- SECTION 1: HIGH PRIORITY INDEXES
-- These address full table scans in common queries
-- =============================================

-- Index for post_access lookups by creator (used in profile earnings calculation)
CREATE INDEX IF NOT EXISTS idx_post_access_creator_id ON post_access(creator_id);

-- Index for post_access lookups by user (used in feed post access checks)
CREATE INDEX IF NOT EXISTS idx_post_access_user_id ON post_access(user_id);

-- Index for tips lookups by post (used in feed tip aggregation)
CREATE INDEX IF NOT EXISTS idx_tips_post_id ON tips(post_id);

-- =============================================
-- SECTION 2: COMPOSITE INDEXES
-- For common multi-column query patterns
-- =============================================

-- Composite index for relationship queries by follower and type
-- Used in: feed page (blocked/followed users), profile page (follow check)
CREATE INDEX IF NOT EXISTS idx_relationships_follower_type ON relationships(follower_id, type);

-- Composite index for posts by user, hidden status, and creation time
-- Used in: profile page (user's posts), feed page (all posts)
CREATE INDEX IF NOT EXISTS idx_posts_user_hidden_created ON posts(user_id, is_hidden, created_at DESC);

-- Composite index for connections by status and participants
-- Used in: unread count calculation
CREATE INDEX IF NOT EXISTS idx_connections_status_initiator ON connections(status, initiator_id);
CREATE INDEX IF NOT EXISTS idx_connections_status_receiver ON connections(status, receiver_id);

-- =============================================
-- SECTION 3: RPC FUNCTIONS
-- Server-side aggregation to avoid N+1 queries
-- =============================================

-- Function: get_user_tips_total
-- Returns total tips earned by a user (sum of creator_share)
-- Used in: profile page earnings display
CREATE OR REPLACE FUNCTION get_user_tips_total(p_user_id TEXT)
RETURNS DECIMAL
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(creator_share), 0)
  FROM tips
  WHERE to_user_id = p_user_id;
$$;

-- Function: get_user_premium_total
-- Returns total premium unlock earnings for a creator
-- Used in: profile page earnings display
CREATE OR REPLACE FUNCTION get_user_premium_total(p_user_id TEXT)
RETURNS DECIMAL
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(creator_share), 0)
  FROM post_access
  WHERE creator_id = p_user_id;
$$;

-- Function: get_total_unread_count
-- Returns total unread message count across all active connections
-- Replaces N+1 query pattern in feed page
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(unread)::INTEGER, 0)
  FROM (
    SELECT COUNT(*) as unread
    FROM connections c
    JOIN messages m ON m.connection_id = c.id
    WHERE (c.initiator_id = p_user_id OR c.receiver_id = p_user_id)
      AND c.status = 'active'
      AND m.sender_id != p_user_id
      AND m.created_at > GREATEST(
        COALESCE(c.last_read_at, '1970-01-01'::timestamptz),
        COALESCE(
          CASE
            WHEN c.initiator_id = p_user_id THEN c.initiator_cleared_at
            ELSE c.receiver_cleared_at
          END,
          '1970-01-01'::timestamptz
        )
      )
    GROUP BY c.id
  ) counts;
$$;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
--
-- New indexes added:
-- - idx_post_access_creator_id
-- - idx_post_access_user_id
-- - idx_tips_post_id
-- - idx_relationships_follower_type
-- - idx_posts_user_hidden_created
-- - idx_connections_status_initiator
-- - idx_connections_status_receiver
--
-- New RPC functions added:
-- - get_user_tips_total(p_user_id TEXT) -> DECIMAL
-- - get_user_premium_total(p_user_id TEXT) -> DECIMAL
-- - get_total_unread_count(p_user_id TEXT) -> INTEGER
--
-- =============================================
