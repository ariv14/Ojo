-- RPC function to fetch discover users with post counts
-- Run this in Supabase SQL Editor to create the function

-- First drop the existing function (required when changing return type)
DROP FUNCTION IF EXISTS get_discover_users(TEXT, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION get_discover_users(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  nullifier_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  country TEXT,
  last_seen_at TIMESTAMPTZ,
  post_count BIGINT,
  wallet_address TEXT
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
    u.last_seen_at,
    COUNT(p.id) as post_count,
    u.wallet_address
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.nullifier_hash AND p.is_hidden = false
  WHERE u.nullifier_hash != p_user_id
    AND u.status = 'active'
    AND (p_search IS NULL OR p_search = ''
         OR u.first_name ILIKE '%' || p_search || '%'
         OR u.last_name ILIKE '%' || p_search || '%')
  GROUP BY u.nullifier_hash, u.first_name, u.last_name, u.avatar_url, u.country, u.last_seen_at, u.created_at, u.wallet_address
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
