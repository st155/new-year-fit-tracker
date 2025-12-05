-- Add intake_time column to intake_logs for tracking which time of day the supplement was taken
ALTER TABLE intake_logs 
ADD COLUMN IF NOT EXISTS intake_time TEXT;

-- Add intake_date column for unique constraint (computed from taken_at)
ALTER TABLE intake_logs 
ADD COLUMN IF NOT EXISTS intake_date DATE;

-- Create unique index to prevent duplicate logs for same supplement + time on same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_logs_unique_daily 
ON intake_logs (user_id, stack_item_id, intake_time, intake_date);

-- Update existing records to set intake_date from taken_at
UPDATE intake_logs 
SET intake_date = taken_at::date 
WHERE intake_date IS NULL AND taken_at IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN intake_logs.intake_time IS 'Time of day: morning, afternoon, evening, before_sleep, as_needed';
COMMENT ON COLUMN intake_logs.intake_date IS 'Date portion of taken_at for unique constraint';