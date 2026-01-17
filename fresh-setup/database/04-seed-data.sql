-- =============================================
-- Ojo SEED DATA (OPTIONAL)
-- File: 04-seed-data.sql
-- Run AFTER all other scripts for test data
-- =============================================

-- =============================================
-- WARNING: This is for TESTING/STAGING only!
-- Do NOT run in production!
-- =============================================

-- =============================================
-- TEST USERS
-- =============================================

-- Note: In production, users are created via World ID verification
-- These test users use fake nullifier_hashes for development

INSERT INTO users (nullifier_hash, first_name, last_name, country, status, is_orb_verified, created_at)
VALUES
  ('test_user_001_nullifier', 'Alice', 'Demo', 'US', 'active', true, NOW() - INTERVAL '30 days'),
  ('test_user_002_nullifier', 'Bob', 'Test', 'UK', 'active', true, NOW() - INTERVAL '25 days'),
  ('test_user_003_nullifier', 'Charlie', 'Sample', 'CA', 'active', true, NOW() - INTERVAL '20 days'),
  ('test_admin_nullifier', 'Admin', 'User', 'US', 'active', true, NOW() - INTERVAL '60 days')
ON CONFLICT (nullifier_hash) DO NOTHING;

-- =============================================
-- TEST POSTS
-- =============================================

-- Note: image_url should point to actual images in storage
-- These are placeholder URLs for structure testing

INSERT INTO posts (user_id, image_url, caption, is_premium, created_at)
VALUES
  ('test_user_001_nullifier', 'https://placeholder.com/test1.jpg', 'First test post!', false, NOW() - INTERVAL '5 days'),
  ('test_user_002_nullifier', 'https://placeholder.com/test2.jpg', 'Hello from Bob', false, NOW() - INTERVAL '4 days'),
  ('test_user_001_nullifier', 'https://placeholder.com/test3.jpg', 'Premium content here', true, NOW() - INTERVAL '3 days'),
  ('test_user_003_nullifier', 'https://placeholder.com/test4.jpg', 'Check this out!', false, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- TEST RELATIONSHIPS (FOLLOWS)
-- =============================================

INSERT INTO relationships (follower_id, target_id, type, created_at)
VALUES
  ('test_user_001_nullifier', 'test_user_002_nullifier', 'follow', NOW() - INTERVAL '10 days'),
  ('test_user_002_nullifier', 'test_user_001_nullifier', 'follow', NOW() - INTERVAL '9 days'),
  ('test_user_003_nullifier', 'test_user_001_nullifier', 'follow', NOW() - INTERVAL '8 days')
ON CONFLICT (follower_id, target_id) DO NOTHING;

-- =============================================
-- TEST CONNECTIONS
-- =============================================

INSERT INTO connections (initiator_id, receiver_id, status, created_at)
VALUES
  ('test_user_001_nullifier', 'test_user_002_nullifier', 'accepted', NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- CLEANUP COMMANDS (Run to remove test data)
-- =============================================

-- To remove all test data, run:
-- DELETE FROM users WHERE nullifier_hash LIKE 'test_%';
-- (CASCADE will remove all related data)

-- =============================================
-- SEED DATA COMPLETE
-- =============================================
