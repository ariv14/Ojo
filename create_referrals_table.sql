-- Referral Tracking System for Ojo
-- Run this in Supabase SQL Editor

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  referred_id TEXT REFERENCES users(nullifier_hash) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, signed_up, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paid_out BOOLEAN DEFAULT FALSE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id) WHERE referred_id IS NOT NULL;

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
-- Users can see their own referrals (as referrer)
CREATE POLICY "Users can view their referrals"
  ON referrals FOR SELECT
  USING (referrer_id = current_setting('request.jwt.claims', true)::json->>'sub'
         OR referred_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow inserting referrals (for signup tracking)
CREATE POLICY "Allow inserting referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

-- Allow updating referrals (for status changes)
CREATE POLICY "Allow updating referrals"
  ON referrals FOR UPDATE
  USING (true);

-- Public read access (needed for anonymous users checking referral codes)
CREATE POLICY "Public read access for referral codes"
  ON referrals FOR SELECT
  USING (true);

-- Grant permissions
GRANT ALL ON referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON referrals TO anon;

-- Function to get referral stats for a user
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_referrals', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'signed_up', COUNT(*) FILTER (WHERE status = 'signed_up'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'unpaid_completed', COUNT(*) FILTER (WHERE status = 'completed' AND paid_out = FALSE),
    'paid_out', COUNT(*) FILTER (WHERE paid_out = TRUE)
  )
  INTO result
  FROM referrals
  WHERE referrer_id = p_user_id;

  RETURN result;
END;
$$;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION get_referral_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(TEXT) TO anon;
