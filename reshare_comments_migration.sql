-- ============================================
-- Reshares & Comments Migration for Ojo
-- ============================================

-- ============================================
-- PART 1: RESHARE FEATURE
-- ============================================

-- Add reshare columns to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS original_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS reshare_comment TEXT;

-- Index for efficient reshare queries
CREATE INDEX IF NOT EXISTS idx_posts_original_post_id ON posts(original_post_id);

-- Prevent duplicate reshares (user can only reshare a post once)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_reshare
ON posts(user_id, original_post_id)
WHERE original_post_id IS NOT NULL;

-- Function: get reshare count for a post
CREATE OR REPLACE FUNCTION get_reshare_count(p_post_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM posts WHERE original_post_id = p_post_id;
$$ LANGUAGE SQL STABLE;

-- Function: check if user has reshared a post
CREATE OR REPLACE FUNCTION has_user_reshared(p_user_id TEXT, p_post_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM posts WHERE user_id = p_user_id AND original_post_id = p_post_id);
$$ LANGUAGE SQL STABLE;

-- ============================================
-- PART 2: COMMENTS FEATURE
-- ============================================

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comment_votes table for likes/dislikes
CREATE TABLE IF NOT EXISTS comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Index for fetching comments by post
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Index for fetching replies to a comment
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);

-- Index for fetching comment votes
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);

-- Function: get comment count for a post
CREATE OR REPLACE FUNCTION get_comment_count(p_post_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comments WHERE post_id = p_post_id;
$$ LANGUAGE SQL STABLE;

-- Function: get comment like count
CREATE OR REPLACE FUNCTION get_comment_like_count(p_comment_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comment_votes WHERE comment_id = p_comment_id AND vote_type = 'like';
$$ LANGUAGE SQL STABLE;

-- Function: get comment dislike count
CREATE OR REPLACE FUNCTION get_comment_dislike_count(p_comment_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comment_votes WHERE comment_id = p_comment_id AND vote_type = 'dislike';
$$ LANGUAGE SQL STABLE;

-- ============================================
-- PERFORMANCE INDEXES FOR FAST LOADING
-- ============================================

-- Composite index for fast comment loading with created_at ordering
CREATE INDEX IF NOT EXISTS idx_comments_post_created
ON comments(post_id, created_at DESC);

-- Index for fast user lookup (avatar, name) when fetching comments
CREATE INDEX IF NOT EXISTS idx_users_nullifier_hash
ON users(nullifier_hash) INCLUDE (first_name, last_name, avatar_url);

-- Index for fast vote counting per comment
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_type
ON comment_votes(comment_id, vote_type);

-- Index for user's votes lookup (to show their existing vote)
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_comment
ON comment_votes(user_id, comment_id);

-- ============================================
-- ENABLE REALTIME FOR COMMENTS (optional)
-- ============================================
-- Uncomment if you want real-time comment updates:
-- ALTER PUBLICATION supabase_realtime ADD TABLE comments;
