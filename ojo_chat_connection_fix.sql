-- =============================================
-- Ojo Chat Connection Fix Migration
-- File: ojo_chat_connection_fix.sql
--
-- Fix for: "Payment successful but failed to create connection"
--
-- Problem: ChatButton.tsx uses upsert with onConflict: 'initiator_id,receiver_id'
-- but the connections table had no UNIQUE constraint on these columns.
--
-- Run this in Supabase SQL Editor for existing databases.
-- =============================================

-- Add UNIQUE constraint to connections table
-- This enables the upsert operation in ChatButton.tsx to work correctly
ALTER TABLE connections
ADD CONSTRAINT unique_connection_pair
UNIQUE (initiator_id, receiver_id);

-- =============================================
-- Verification:
-- Run this query to confirm the constraint was added:
--
-- SELECT constraint_name, table_name
-- FROM information_schema.table_constraints
-- WHERE table_name = 'connections' AND constraint_type = 'UNIQUE';
--
-- Expected output should include: unique_connection_pair
-- =============================================
