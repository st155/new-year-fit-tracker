-- Add ended_at column to track actual end date of supplement intake
ALTER TABLE user_stack 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

COMMENT ON COLUMN user_stack.ended_at IS 'Actual end date when supplement was removed from active stack';