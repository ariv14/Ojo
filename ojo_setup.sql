-- =============================================
-- Ojo COMPLETE DATABASE SETUP
-- File: ojo_setup.sql
--
-- Single consolidated DDL for fresh Supabase setup
-- Run this entire file in Supabase SQL Editor
-- =============================================

-- =============================================
-- SECTION 0: CUSTOM TYPES
-- =============================================

-- Media type enum for posts (image, album, reel)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
        CREATE TYPE media_type AS ENUM ('image', 'album', 'reel');
    END IF;
END$$;

-- =============================================
-- SECTION 1: TABLES (13 Tables)
-- =============================================

-- 1. USERS TABLE
-- Primary user table, keyed by World ID nullifier_hash
CREATE TABLE IF NOT EXISTS users (
  nullifier_hash TEXT PRIMARY KEY,
  wallet_address TEXT,
  first_name TEXT,
  last_name TEXT,
  country TEXT,
  avatar_url TEXT,
  sex TEXT,
  age INTEGER,
  status TEXT DEFAULT 'active',
  is_orb_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  invisible_mode_expiry TIMESTAMPTZ
);

-- 2. POSTS TABLE
-- User-generated content with images, albums, and reels
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  boosted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Albums & Reels support
  media_type media_type DEFAULT 'image',
  media_urls JSONB DEFAULT NULL,
  thumbnail_url TEXT DEFAULT NULL,
  duration_seconds NUMERIC DEFAULT NULL
);

-- Column documentation for albums & reels
COMMENT ON COLUMN posts.media_type IS 'Type of media: image (single), album (multiple images), or reel (video)';
COMMENT ON COLUMN posts.media_urls IS 'JSONB array of media objects: [{key: "posts/user/post/media_0.jpg", type: "image"}]';
COMMENT ON COLUMN posts.thumbnail_url IS 'R2 key for reel thumbnail image';
COMMENT ON COLUMN posts.duration_seconds IS 'Video duration in seconds (max 10s for reels)';

-- 3. CONNECTIONS TABLE
-- Chat connections between users
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  is_blocked BOOLEAN DEFAULT false,
  blocked_by TEXT,
  last_read_at TIMESTAMPTZ,
  initiator_cleared_at TIMESTAMPTZ,
  receiver_cleared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(initiator_id, receiver_id)
);

-- 4. MESSAGES TABLE
-- Chat messages within connections
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. POST VOTES TABLE
-- Upvotes/downvotes on posts
CREATE TABLE IF NOT EXISTS post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  vote_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 6. TIPS TABLE
-- WLD tips sent to creators
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  to_wallet_address TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  creator_share DECIMAL,
  owner_share DECIMAL,
  transaction_hash TEXT,
  payout_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. POST ACCESS TABLE
-- Premium content unlocks
CREATE TABLE IF NOT EXISTS post_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  creator_id TEXT REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  creator_wallet_address TEXT,
  amount DECIMAL,
  creator_share DECIMAL,
  owner_share DECIMAL,
  payout_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 8. RELATIONSHIPS TABLE
-- Follow/block relationships
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, target_id)
);

-- 9. PROFILE VIEWS TABLE
-- Track who viewed profiles
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. REPORTS TABLE
-- User reports for moderation
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SUPPORT TICKETS TABLE
-- User support requests
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  admin_response TEXT,
  user_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TRANSACTIONS TABLE
-- Payment transaction records
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  receiver_id TEXT REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. REFERRALS TABLE
-- Referral tracking for invite bonuses
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  referred_id TEXT REFERENCES users(nullifier_hash) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, signed_up, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paid_out BOOLEAN DEFAULT FALSE
);

-- =============================================
-- SECTION 2: INDEXES (35 Indexes)
-- =============================================

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hidden ON posts(is_hidden);
CREATE INDEX IF NOT EXISTS idx_posts_boosted ON posts(boosted_until);
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type);
CREATE INDEX IF NOT EXISTS idx_posts_media_urls ON posts USING GIN (media_urls);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Relationships indexes
CREATE INDEX IF NOT EXISTS idx_relationships_follower_id ON relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target_id ON relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type);

-- Profile views indexes
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON profile_views(created_at DESC);

-- Post votes indexes
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);

-- Tips indexes
CREATE INDEX IF NOT EXISTS idx_tips_to_user_id ON tips(to_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_from_user_id ON tips(from_user_id);

-- Connections indexes
CREATE INDEX IF NOT EXISTS idx_connections_initiator ON connections(initiator_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target_type ON reports(target_type);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);

-- Users indexes (for search and discovery)
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Post access indexes (for earnings queries)
CREATE INDEX IF NOT EXISTS idx_post_access_creator_id ON post_access(creator_id);
CREATE INDEX IF NOT EXISTS idx_post_access_user_id ON post_access(user_id);

-- Tips index for post lookups
CREATE INDEX IF NOT EXISTS idx_tips_post_id ON tips(post_id);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id) WHERE referred_id IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_relationships_follower_type ON relationships(follower_id, type);
CREATE INDEX IF NOT EXISTS idx_posts_user_hidden_created ON posts(user_id, is_hidden, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connections_status_initiator ON connections(status, initiator_id);
CREATE INDEX IF NOT EXISTS idx_connections_status_receiver ON connections(status, receiver_id);

-- =============================================
-- SECTION 3: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECTION 4: RLS POLICIES (36 Policies)
-- Note: Permissive policies - app-level enforcement
-- =============================================

-- USERS POLICIES (4)
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own profile"
  ON users FOR DELETE
  USING (true);

-- POSTS POLICIES (4)
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_hidden = false);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (true);

-- CONNECTIONS POLICIES (4)
CREATE POLICY "Connections viewable by participants"
  ON connections FOR SELECT
  USING (true);

CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update connections"
  ON connections FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete connections"
  ON connections FOR DELETE
  USING (true);

-- MESSAGES POLICIES (4)
CREATE POLICY "Messages viewable by connection participants"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (true);

-- POST_VOTES POLICIES (4)
CREATE POLICY "Votes are viewable by everyone"
  ON post_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can vote"
  ON post_votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can change vote"
  ON post_votes FOR UPDATE
  USING (true);

CREATE POLICY "Users can remove vote"
  ON post_votes FOR DELETE
  USING (true);

-- TIPS POLICIES (2)
CREATE POLICY "Tips are viewable by everyone"
  ON tips FOR SELECT
  USING (true);

CREATE POLICY "Users can send tips"
  ON tips FOR INSERT
  WITH CHECK (true);

-- POST_ACCESS POLICIES (2)
CREATE POLICY "Post access viewable"
  ON post_access FOR SELECT
  USING (true);

CREATE POLICY "Users can unlock posts"
  ON post_access FOR INSERT
  WITH CHECK (true);

-- RELATIONSHIPS POLICIES (4)
CREATE POLICY "Relationships viewable"
  ON relationships FOR SELECT
  USING (true);

CREATE POLICY "Users can create relationships"
  ON relationships FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update relationships"
  ON relationships FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete relationships"
  ON relationships FOR DELETE
  USING (true);

-- PROFILE_VIEWS POLICIES (2)
CREATE POLICY "Profile views viewable"
  ON profile_views FOR SELECT
  USING (true);

CREATE POLICY "Users can log views"
  ON profile_views FOR INSERT
  WITH CHECK (true);

-- REPORTS POLICIES (3)
CREATE POLICY "Reports viewable by admin"
  ON reports FOR SELECT
  USING (true);

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update reports"
  ON reports FOR UPDATE
  USING (true);

-- SUPPORT_TICKETS POLICIES (4)
CREATE POLICY "Tickets viewable"
  ON support_tickets FOR SELECT
  USING (true);

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Tickets can be updated"
  ON support_tickets FOR UPDATE
  USING (true);

CREATE POLICY "Tickets can be deleted"
  ON support_tickets FOR DELETE
  USING (true);

-- TRANSACTIONS POLICIES (2)
CREATE POLICY "Transactions viewable"
  ON transactions FOR SELECT
  USING (true);

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- REFERRALS POLICIES (3)
CREATE POLICY "Referrals viewable"
  ON referrals FOR SELECT
  USING (true);

CREATE POLICY "Users can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update referrals"
  ON referrals FOR UPDATE
  USING (true);

-- =============================================
-- SECTION 5: RPC FUNCTIONS (8 Functions)
-- =============================================

-- Function: delete_conversation
-- Deletes a chat connection and all its messages (via CASCADE)
-- Called from: src/app/chat/[id]/page.tsx
CREATE OR REPLACE FUNCTION delete_conversation(
  p_connection_id UUID,
  p_user_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the connection (messages cascade automatically)
  -- Only allow if user is a participant
  DELETE FROM connections
  WHERE id = p_connection_id
    AND (initiator_id = p_user_id OR receiver_id = p_user_id);
END;
$$;

-- Function: reset_all_data
-- Admin factory reset - clears all data from all tables
-- Called from: src/app/api/admin/reset/route.ts
-- WARNING: This is destructive and cannot be undone
CREATE OR REPLACE FUNCTION reset_all_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete in order respecting foreign key constraints
  -- Messages first (depends on connections and users)
  DELETE FROM messages;

  -- Delete dependent tables
  DELETE FROM post_votes;
  DELETE FROM tips;
  DELETE FROM post_access;
  DELETE FROM relationships;
  DELETE FROM profile_views;
  DELETE FROM reports;
  DELETE FROM support_tickets;
  DELETE FROM transactions;

  -- Delete connections (after messages)
  DELETE FROM connections;

  -- Delete posts (after votes, tips, access)
  DELETE FROM posts;

  -- Delete users last (all FKs reference this)
  DELETE FROM users;
END;
$$;

-- Function: get_user_tips_total
-- Returns total tips earned by a user (sum of creator_share)
-- Called from: src/app/profile/[id]/page.tsx
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
-- Called from: src/app/profile/[id]/page.tsx
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
-- Called from: src/app/feed/page.tsx
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

-- Function: get_referral_stats
-- Returns referral statistics for a user
-- Called from: src/app/discover/page.tsx
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_referrals', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'signed_up', COUNT(*) FILTER (WHERE status = 'signed_up'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'unpaid_completed', COUNT(*) FILTER (WHERE status = 'completed' AND paid_out = FALSE),
    'paid_out', COUNT(*) FILTER (WHERE paid_out = TRUE)
  )
  INTO result
  FROM referrals
  WHERE referrer_id = p_user_id;

  RETURN result;
END;
$$;

-- =============================================
-- SECTION 6: REALTIME CONFIGURATION
-- =============================================

-- Enable realtime for chat functionality and feed updates
-- These tables need realtime for live messaging and "New Posts" notifications
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- =============================================
-- SECTION 7: STORAGE BUCKET POLICIES
-- =============================================
--
-- IMPORTANT: CREATE BUCKETS MANUALLY FIRST!
-- Before running this section:
-- 1. Go to Supabase Dashboard -> Storage
-- 2. Click "New Bucket"
-- 3. Create bucket named "avatars" (Public: ON)
-- 4. Create bucket named "photos" (Public: ON)
--
-- Then run the policies below, or run them after
-- bucket creation in a separate execution.
-- =============================================

-- AVATARS BUCKET POLICIES (4)
-- For user profile pictures

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');

-- PHOTOS BUCKET POLICIES (4)
-- For post images

CREATE POLICY "Post images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Anyone can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anyone can update photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'photos');

CREATE POLICY "Anyone can delete photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos');

-- =============================================
-- SETUP COMPLETE
-- =============================================
--
-- Summary:
-- - 1 Custom type (media_type enum)
-- - 13 Tables created with CASCADE DELETE
-- - 35 Indexes for query performance (including composite indexes)
-- - RLS enabled on all 13 tables
-- - 39 RLS policies (permissive)
-- - 8 RPC functions:
--   * delete_conversation - delete chat and messages
--   * reset_all_data - admin factory reset
--   * get_user_tips_total - sum tips for profile earnings
--   * get_user_premium_total - sum premium unlocks for profile earnings
--   * get_total_unread_count - count unread messages (single query)
--   * get_users_with_post_counts - admin page users with post counts
--   * get_inbox_chats - inbox page chats in single query
--   * get_referral_stats - referral tracking statistics
-- - Realtime enabled on messages, connections, posts
-- - 8 Storage policies (4 avatars, 4 photos)
--
-- Verification:
-- 1. Check Tables: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- 2. Check Policies: SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
-- 3. Check Functions: SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
-- 4. Check Realtime: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
--
-- =============================================
