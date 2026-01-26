-- Migration: Add username column for World App profile sync
-- Run this in Supabase SQL Editor before deploying the updated code

-- Add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

-- Create index for username lookups (used in search and discovery)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- For existing users, copy first_name to username as initial value
-- This ensures existing users have a username until they log in again
UPDATE users
SET username = first_name
WHERE username IS NULL AND first_name IS NOT NULL;

-- Optional: Update RPC functions to include username in their return values
-- Note: If you have custom RPC functions like get_discover_users, get_inbox_chats, etc.,
-- you may need to update them to select and return the username column.

-- Example for get_discover_users (adjust based on your actual function):
-- CREATE OR REPLACE FUNCTION get_discover_users(
--   p_user_id TEXT,
--   p_limit INT,
--   p_offset INT,
--   p_search TEXT
-- )
-- RETURNS TABLE (
--   nullifier_hash TEXT,
--   username TEXT,       -- Added
--   first_name TEXT,
--   last_name TEXT,
--   avatar_url TEXT,
--   country TEXT,
--   last_seen_at TIMESTAMP,
--   post_count BIGINT,
--   wallet_address TEXT
-- ) AS $$
-- ...
-- $$ LANGUAGE plpgsql;

-- Verification query - run after migration to confirm column exists:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name = 'username';
