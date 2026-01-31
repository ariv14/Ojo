-- =============================================
-- COMMENTS & COMMENT_VOTES RLS POLICIES
-- Run this migration against live DB to fix
-- comment edit/delete not persisting
-- =============================================

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- COMMENTS: Public read, authenticated write
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (true);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (true);

-- COMMENT_VOTES: Public read, authenticated write
CREATE POLICY "Comment votes are viewable by everyone" ON comment_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote on comments" ON comment_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can change comment vote" ON comment_votes FOR UPDATE USING (true);
CREATE POLICY "Users can remove comment vote" ON comment_votes FOR DELETE USING (true);
