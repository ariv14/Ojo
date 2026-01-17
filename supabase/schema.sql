-- =============================================
-- OJO DATABASE SCHEMA
-- Run this in Supabase SQL Editor for new setup
-- =============================================

-- 1. USERS TABLE
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
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  boosted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  is_blocked BOOLEAN DEFAULT false,
  blocked_by TEXT,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. POST VOTES TABLE
CREATE TABLE IF NOT EXISTS post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  vote_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 6. TIPS TABLE
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
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, target_id)
);

-- 9. PROFILE VIEWS TABLE
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. REPORTS TABLE
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
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  receiver_id TEXT REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hidden ON posts(is_hidden);
CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_relationships_follower_id ON relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target_id ON relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_tips_to_user_id ON tips(to_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(initiator_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
