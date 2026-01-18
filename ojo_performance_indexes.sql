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
-- SECTION 4: ADDITIONAL RPC FUNCTIONS FOR PERFORMANCE
-- =============================================

-- Function: get_users_with_post_counts
-- Returns users with their post counts in a single query (avoids N+1 in admin)
-- Called from: src/app/admin/page.tsx
CREATE OR REPLACE FUNCTION get_users_with_post_counts(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest'
)
RETURNS TABLE (
  nullifier_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  country TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  post_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    u.nullifier_hash,
    u.first_name,
    u.last_name,
    u.avatar_url,
    u.country,
    u.status,
    u.created_at,
    u.last_seen_at,
    COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.nullifier_hash AND p.is_hidden = false
  WHERE (p_search IS NULL OR p_search = '' OR u.first_name ILIKE '%' || p_search || '%' OR u.last_name ILIKE '%' || p_search || '%')
  GROUP BY u.nullifier_hash, u.first_name, u.last_name, u.avatar_url, u.country, u.status, u.created_at, u.last_seen_at
  ORDER BY
    CASE WHEN p_sort = 'activity' THEN u.last_seen_at END DESC NULLS LAST,
    CASE WHEN p_sort != 'activity' THEN u.created_at END DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Function: get_inbox_chats
-- Returns all active chats for a user with other user's info in a single query
-- Avoids dual queries and O(n²) deduplication in inbox page
-- Called from: src/app/inbox/page.tsx
CREATE OR REPLACE FUNCTION get_inbox_chats(p_user_id TEXT)
RETURNS TABLE (
  connection_id UUID,
  other_user_id TEXT,
  other_first_name TEXT,
  other_last_name TEXT,
  other_avatar_url TEXT,
  other_last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (
    CASE WHEN c.initiator_id = p_user_id THEN c.receiver_id ELSE c.initiator_id END
  )
    c.id as connection_id,
    CASE WHEN c.initiator_id = p_user_id THEN c.receiver_id ELSE c.initiator_id END as other_user_id,
    u.first_name as other_first_name,
    u.last_name as other_last_name,
    u.avatar_url as other_avatar_url,
    u.last_seen_at as other_last_seen_at,
    c.created_at
  FROM connections c
  JOIN users u ON u.nullifier_hash = CASE WHEN c.initiator_id = p_user_id THEN c.receiver_id ELSE c.initiator_id END
  WHERE (c.initiator_id = p_user_id OR c.receiver_id = p_user_id)
    AND c.status = 'active'
  ORDER BY
    CASE WHEN c.initiator_id = p_user_id THEN c.receiver_id ELSE c.initiator_id END,
    c.created_at DESC;
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
-- - get_users_with_post_counts(...) -> TABLE (for admin page)
-- - get_inbox_chats(p_user_id TEXT) -> TABLE (for inbox page)
--
-- =============================================
