-- =============================================
-- Chat Read Receipts Migration
-- File: chat_read_receipts_migration.sql
--
-- Run this in Supabase SQL Editor to add read receipts
-- functionality to an existing Ojo database.
-- =============================================

-- Add is_read column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN messages.is_read IS 'Whether the recipient has read this message';

-- Create composite index for efficient read status queries
CREATE INDEX IF NOT EXISTS idx_messages_connection_sender_read
  ON messages(connection_id, sender_id, is_read);

-- Function: get_chat_data
-- Returns all chat page data in a single query (connection, other user, messages)
-- Consolidates 3 sequential queries into 1 RPC call for performance
-- Called from: src/app/chat/[id]/page.tsx
CREATE OR REPLACE FUNCTION get_chat_data(
  p_connection_id UUID,
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  v_conn RECORD;
  v_other_user RECORD;
  v_cleared_at TIMESTAMPTZ;
  v_other_user_id TEXT;
  v_messages JSON;
  v_message_count INTEGER;
BEGIN
  -- Get connection data
  SELECT
    initiator_id,
    receiver_id,
    initiator_cleared_at,
    receiver_cleared_at,
    is_blocked,
    blocked_by
  INTO v_conn
  FROM connections
  WHERE id = p_connection_id
    AND (initiator_id = p_user_id OR receiver_id = p_user_id);

  -- Return null if connection not found or user not a participant
  IF v_conn IS NULL THEN
    RETURN NULL;
  END IF;

  -- Determine other user and cleared_at based on user's role
  IF v_conn.initiator_id = p_user_id THEN
    v_other_user_id := v_conn.receiver_id;
    v_cleared_at := v_conn.initiator_cleared_at;
  ELSE
    v_other_user_id := v_conn.initiator_id;
    v_cleared_at := v_conn.receiver_cleared_at;
  END IF;

  -- Get other user's info
  SELECT first_name, wallet_address
  INTO v_other_user
  FROM users
  WHERE nullifier_hash = v_other_user_id;

  -- Get messages with sender names
  SELECT json_agg(msg ORDER BY msg.created_at ASC), COUNT(*)
  INTO v_messages, v_message_count
  FROM (
    SELECT
      m.id,
      m.sender_id,
      m.content,
      m.created_at,
      m.is_edited,
      m.is_read,
      u.first_name as sender_first_name
    FROM messages m
    JOIN users u ON u.nullifier_hash = m.sender_id
    WHERE m.connection_id = p_connection_id
      AND (v_cleared_at IS NULL OR m.created_at > v_cleared_at)
    ORDER BY m.created_at DESC
    LIMIT p_limit
  ) msg;

  -- Build result JSON
  result := json_build_object(
    'connection', json_build_object(
      'is_blocked', v_conn.is_blocked,
      'blocked_by', v_conn.blocked_by,
      'cleared_at', v_cleared_at
    ),
    'other_user', json_build_object(
      'id', v_other_user_id,
      'first_name', v_other_user.first_name,
      'wallet_address', v_other_user.wallet_address
    ),
    'messages', COALESCE(v_messages, '[]'::json),
    'has_more', v_message_count = p_limit
  );

  RETURN result;
END;
$$;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
--
-- Changes applied:
-- 1. Added is_read column to messages table (default: false)
-- 2. Added composite index for read receipt queries
-- 3. Added get_chat_data RPC function for faster chat loading
--
-- =============================================
