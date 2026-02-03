-- ==============================================
-- OJO Rewards System Schema
-- ==============================================

-- User balances and streak tracking
CREATE TABLE IF NOT EXISTS user_balances (
  user_id TEXT PRIMARY KEY REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  ojo_balance DECIMAL(10, 4) NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_claim_at TIMESTAMPTZ,
  streak_expires_at TIMESTAMPTZ,
  total_claimed DECIMAL(10, 4) NOT NULL DEFAULT 0,
  claim_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim history
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(nullifier_hash) ON DELETE CASCADE,
  amount DECIMAL(10, 4) NOT NULL,
  streak_day INTEGER NOT NULL,
  tx_hash TEXT, -- On-chain transaction hash if applicable
  claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimed_at ON claims(claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_balances_streak ON user_balances(current_streak DESC);

-- Enable Row Level Security
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read their own data
CREATE POLICY "Users can view own balance" ON user_balances
  FOR SELECT USING (true);

CREATE POLICY "Users can view own claims" ON claims
  FOR SELECT USING (true);

-- ==============================================
-- RPC Functions for Claim Logic
-- ==============================================

-- Check if user can claim today
CREATE OR REPLACE FUNCTION can_claim_today(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance user_balances%ROWTYPE;
  v_can_claim BOOLEAN;
  v_seconds_until INTEGER;
  v_next_claim_at TIMESTAMPTZ;
BEGIN
  -- Get or create user balance record
  SELECT * INTO v_balance FROM user_balances WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- First time user - can claim immediately
    RETURN json_build_object(
      'canClaim', true,
      'balance', 0,
      'streak', 0,
      'nextClaimAt', NULL,
      'secondsUntil', 0
    );
  END IF;

  -- Check if 24 hours have passed since last claim
  IF v_balance.last_claim_at IS NULL THEN
    v_can_claim := true;
    v_next_claim_at := NULL;
    v_seconds_until := 0;
  ELSE
    v_next_claim_at := v_balance.last_claim_at + INTERVAL '24 hours';
    v_can_claim := NOW() >= v_next_claim_at;

    IF v_can_claim THEN
      v_seconds_until := 0;
    ELSE
      v_seconds_until := EXTRACT(EPOCH FROM (v_next_claim_at - NOW()))::INTEGER;
    END IF;
  END IF;

  RETURN json_build_object(
    'canClaim', v_can_claim,
    'balance', v_balance.ojo_balance,
    'streak', v_balance.current_streak,
    'longestStreak', v_balance.longest_streak,
    'totalClaimed', v_balance.total_claimed,
    'claimCount', v_balance.claim_count,
    'nextClaimAt', v_next_claim_at,
    'secondsUntil', GREATEST(0, v_seconds_until),
    'streakExpiresAt', v_balance.streak_expires_at
  );
END;
$$;

-- Process a claim
CREATE OR REPLACE FUNCTION process_claim(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance user_balances%ROWTYPE;
  v_can_claim BOOLEAN;
  v_new_streak INTEGER;
  v_amount DECIMAL(10, 4);
  v_base_amount DECIMAL(10, 4) := 1.0; -- Base OJO per claim
  v_streak_bonus DECIMAL(10, 4);
  v_streak_expired BOOLEAN;
BEGIN
  -- Get user balance record
  SELECT * INTO v_balance FROM user_balances WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- Create new balance record for first-time claimers
    v_new_streak := 1;
    v_streak_bonus := 0;
    v_amount := v_base_amount;

    INSERT INTO user_balances (
      user_id, ojo_balance, current_streak, longest_streak,
      last_claim_at, streak_expires_at, total_claimed, claim_count
    ) VALUES (
      p_user_id, v_amount, v_new_streak, v_new_streak,
      NOW(), NOW() + INTERVAL '48 hours', v_amount, 1
    );

    -- Record the claim
    INSERT INTO claims (user_id, amount, streak_day)
    VALUES (p_user_id, v_amount, v_new_streak);

    RETURN json_build_object(
      'success', true,
      'amount', v_amount,
      'newBalance', v_amount,
      'streak', v_new_streak,
      'isStreakBonus', false,
      'message', 'Welcome! Your first OJO claim!'
    );
  END IF;

  -- Check if 24 hours have passed
  IF v_balance.last_claim_at IS NOT NULL AND NOW() < v_balance.last_claim_at + INTERVAL '24 hours' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Too early to claim',
      'nextClaimAt', v_balance.last_claim_at + INTERVAL '24 hours'
    );
  END IF;

  -- Check if streak has expired (48 hours since last claim)
  v_streak_expired := v_balance.streak_expires_at IS NOT NULL AND NOW() > v_balance.streak_expires_at;

  IF v_streak_expired THEN
    -- Reset streak
    v_new_streak := 1;
    v_streak_bonus := 0;
  ELSE
    -- Continue streak
    v_new_streak := v_balance.current_streak + 1;
    -- Streak bonus: +0.1 OJO per streak day, max +1.0
    v_streak_bonus := LEAST(v_new_streak * 0.1, 1.0);
  END IF;

  v_amount := v_base_amount + v_streak_bonus;

  -- Update balance
  UPDATE user_balances
  SET
    ojo_balance = ojo_balance + v_amount,
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_claim_at = NOW(),
    streak_expires_at = NOW() + INTERVAL '48 hours',
    total_claimed = total_claimed + v_amount,
    claim_count = claim_count + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record the claim
  INSERT INTO claims (user_id, amount, streak_day)
  VALUES (p_user_id, v_amount, v_new_streak);

  RETURN json_build_object(
    'success', true,
    'amount', v_amount,
    'newBalance', v_balance.ojo_balance + v_amount,
    'streak', v_new_streak,
    'longestStreak', GREATEST(v_balance.longest_streak, v_new_streak),
    'isStreakBonus', v_streak_bonus > 0,
    'streakBonus', v_streak_bonus,
    'wasStreakReset', v_streak_expired,
    'message', CASE
      WHEN v_streak_expired THEN 'Streak reset! Start building again!'
      WHEN v_new_streak >= 7 THEN 'Amazing! Week-long streak!'
      WHEN v_streak_bonus > 0 THEN 'Streak bonus earned!'
      ELSE 'OJO claimed successfully!'
    END
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_claim_today(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION process_claim(TEXT) TO authenticated, anon;
