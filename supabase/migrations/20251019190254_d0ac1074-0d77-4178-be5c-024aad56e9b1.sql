-- Add description column to training_plan_workouts for AI compatibility
ALTER TABLE training_plan_workouts 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_training_plan_workouts_plan_id 
ON training_plan_workouts(plan_id);