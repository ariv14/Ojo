-- Ojo Database Migration: Per-User Chat Clearing
-- Run this SQL in Supabase SQL Editor to enable per-user chat clearing
--
-- This migration adds two timestamp columns to the connections table
-- that track when each user cleared their view of the conversation.
-- When a user clears a chat, only their cleared_at column is updated.
-- Messages created before their cleared_at are hidden from their view.

-- Add cleared_at columns for initiator and receiver
ALTER TABLE connections
ADD COLUMN IF NOT EXISTS initiator_cleared_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receiver_cleared_at TIMESTAMPTZ;

-- Verify the columns were added
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'connections' AND column_name LIKE '%cleared_at';
