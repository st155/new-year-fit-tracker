-- Add columns for different ranking types
ALTER TABLE challenge_points 
ADD COLUMN IF NOT EXISTS activity_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recovery_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_score INTEGER DEFAULT 0;

-- Create index for faster sorting by different scores
CREATE INDEX IF NOT EXISTS idx_challenge_points_activity_score ON challenge_points(challenge_id, activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_points_recovery_score ON challenge_points(challenge_id, recovery_score DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_points_progress_score ON challenge_points(challenge_id, progress_score DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_points_balance_score ON challenge_points(challenge_id, balance_score DESC);