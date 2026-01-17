-- =============================================
-- Ojo ROW LEVEL SECURITY POLICIES
-- File: 02-policies.sql
-- Run AFTER 01-schema.sql
-- =============================================

-- =============================================
-- ENABLE RLS ON ALL TABLES
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

-- =============================================
-- USERS POLICIES
-- Public read, authenticated write
-- =============================================

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

-- =============================================
-- POSTS POLICIES
-- Public read (non-hidden), owner write
-- =============================================

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

-- =============================================
-- CONNECTIONS POLICIES
-- Participants can view and manage
-- =============================================

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

-- =============================================
-- MESSAGES POLICIES
-- Connection participants only
-- =============================================

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

-- =============================================
-- POST_VOTES POLICIES
-- Public read, authenticated write
-- =============================================

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

-- =============================================
-- TIPS POLICIES
-- Public read, authenticated create
-- =============================================

CREATE POLICY "Tips are viewable by everyone"
  ON tips FOR SELECT
  USING (true);

CREATE POLICY "Users can send tips"
  ON tips FOR INSERT
  WITH CHECK (true);

-- =============================================
-- POST_ACCESS POLICIES
-- Owner and buyer can view
-- =============================================

CREATE POLICY "Post access viewable"
  ON post_access FOR SELECT
  USING (true);

CREATE POLICY "Users can unlock posts"
  ON post_access FOR INSERT
  WITH CHECK (true);

-- =============================================
-- RELATIONSHIPS POLICIES
-- Self manage follows/blocks
-- =============================================

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

-- =============================================
-- PROFILE_VIEWS POLICIES
-- Profile owner can view
-- =============================================

CREATE POLICY "Profile views viewable"
  ON profile_views FOR SELECT
  USING (true);

CREATE POLICY "Users can log views"
  ON profile_views FOR INSERT
  WITH CHECK (true);

-- =============================================
-- REPORTS POLICIES
-- Admin and reporter can view
-- =============================================

CREATE POLICY "Reports viewable by admin"
  ON reports FOR SELECT
  USING (true);

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update reports"
  ON reports FOR UPDATE
  USING (true);

-- =============================================
-- SUPPORT_TICKETS POLICIES
-- User can manage own tickets
-- =============================================

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

-- =============================================
-- TRANSACTIONS POLICIES
-- Participants can view
-- =============================================

CREATE POLICY "Transactions viewable"
  ON transactions FOR SELECT
  USING (true);

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- =============================================
-- POLICIES COMPLETE
-- Next: Run 03-storage.sql
-- =============================================
