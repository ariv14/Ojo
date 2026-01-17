-- Ojo Database Migration: CASCADE DELETE Foreign Keys
-- Run this SQL in Supabase SQL Editor to enable cascade deletes

-- Posts cascade when user deleted
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;

-- Post votes cascade on user/post deletion
ALTER TABLE post_votes DROP CONSTRAINT IF EXISTS post_votes_user_id_fkey;
ALTER TABLE post_votes DROP CONSTRAINT IF EXISTS post_votes_post_id_fkey;
ALTER TABLE post_votes ADD CONSTRAINT post_votes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
ALTER TABLE post_votes ADD CONSTRAINT post_votes_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Post access cascade
ALTER TABLE post_access DROP CONSTRAINT IF EXISTS post_access_user_id_fkey;
ALTER TABLE post_access DROP CONSTRAINT IF EXISTS post_access_post_id_fkey;
ALTER TABLE post_access DROP CONSTRAINT IF EXISTS post_access_creator_id_fkey;
ALTER TABLE post_access ADD CONSTRAINT post_access_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
ALTER TABLE post_access ADD CONSTRAINT post_access_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE post_access ADD CONSTRAINT post_access_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;

-- Profile views cascade
ALTER TABLE profile_views DROP CONSTRAINT IF EXISTS profile_views_viewer_id_fkey;
ALTER TABLE profile_views DROP CONSTRAINT IF EXISTS profile_views_profile_id_fkey;
ALTER TABLE profile_views ADD CONSTRAINT profile_views_viewer_id_fkey
  FOREIGN KEY (viewer_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
ALTER TABLE profile_views ADD CONSTRAINT profile_views_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;

-- Relationships cascade
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_follower_id_fkey;
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_target_id_fkey;
ALTER TABLE relationships ADD CONSTRAINT relationships_follower_id_fkey
  FOREIGN KEY (follower_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
ALTER TABLE relationships ADD CONSTRAINT relationships_target_id_fkey
  FOREIGN KEY (target_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;

-- Tips cascade
ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_from_user_id_fkey;
ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_to_user_id_fkey;
ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_post_id_fkey;
ALTER TABLE tips ADD CONSTRAINT tips_from_user_id_fkey
  FOREIGN KEY (from_user_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
ALTER TABLE tips ADD CONSTRAINT tips_to_user_id_fkey
  FOREIGN KEY (to_user_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
ALTER TABLE tips ADD CONSTRAINT tips_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Connections cascade
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_initiator_id_fkey;
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_receiver_id_fkey;
ALTER TABLE connections ADD CONSTRAINT connections_initiator_id_fkey
  FOREIGN KEY (initiator_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
ALTER TABLE connections ADD CONSTRAINT connections_receiver_id_fkey
  FOREIGN KEY (receiver_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;

-- Messages cascade
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_connection_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_connection_id_fkey
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE;

-- Reports cascade on reporter
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;

-- Support tickets cascade
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(nullifier_hash) ON DELETE CASCADE;
