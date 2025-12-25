-- Create unique index to prevent duplicate measurements from the same source per date
CREATE UNIQUE INDEX IF NOT EXISTS measurements_goal_user_date_source_idx 
ON public.measurements(goal_id, user_id, measurement_date, source)
WHERE source IS NOT NULL;

-- Add index for faster lookup of running goals
CREATE INDEX IF NOT EXISTS goals_user_goal_name_idx 
ON public.goals(user_id, goal_name) 
WHERE goal_name LIKE '%Бег%';