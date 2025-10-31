-- Add columns for points breakdown in challenge_points table
ALTER TABLE challenge_points 
ADD COLUMN IF NOT EXISTS performance_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recovery_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS synergy_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_breakdown JSONB DEFAULT '{}'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_challenge_points_breakdown ON challenge_points USING gin(points_breakdown);

-- Update existing records to have empty breakdown
UPDATE challenge_points 
SET points_breakdown = '{}'::jsonb 
WHERE points_breakdown IS NULL;