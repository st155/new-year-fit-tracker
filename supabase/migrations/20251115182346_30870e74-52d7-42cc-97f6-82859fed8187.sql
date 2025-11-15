-- Add performance index for workouts table
-- This significantly speeds up queries filtering by user_id and ordering by start_time

CREATE INDEX IF NOT EXISTS idx_workouts_user_start_time 
ON workouts (user_id, start_time DESC);

-- Add comment explaining the index purpose
COMMENT ON INDEX idx_workouts_user_start_time IS 
'Performance index for workout history queries - speeds up fetching user workouts ordered by date';