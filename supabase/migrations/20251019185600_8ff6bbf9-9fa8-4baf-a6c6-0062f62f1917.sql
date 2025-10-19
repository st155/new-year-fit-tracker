-- Add baseline columns to challenge_participants table
ALTER TABLE challenge_participants 
ADD COLUMN IF NOT EXISTS baseline_weight NUMERIC,
ADD COLUMN IF NOT EXISTS baseline_body_fat NUMERIC,
ADD COLUMN IF NOT EXISTS baseline_muscle_mass NUMERIC,
ADD COLUMN IF NOT EXISTS baseline_source TEXT CHECK (baseline_source IN ('inbody', 'withings', 'manual')),
ADD COLUMN IF NOT EXISTS baseline_recorded_at TIMESTAMP WITH TIME ZONE;

-- Create index for fast baseline lookups
CREATE INDEX IF NOT EXISTS idx_challenge_participants_baseline 
ON challenge_participants(challenge_id, user_id) 
WHERE baseline_body_fat IS NOT NULL;