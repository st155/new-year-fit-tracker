-- Phase 1: Database Refinements for V3.0 AI Juggernaut Engine

-- 1. Fix critical bug in workout_logs - add missing columns
ALTER TABLE workout_logs 
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS workout_name TEXT;

-- 2. Add RIR columns to workout_logs (keep RPE for backward compatibility)
ALTER TABLE workout_logs 
  ADD COLUMN IF NOT EXISTS prescribed_rir NUMERIC CHECK (prescribed_rir BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS actual_rir NUMERIC CHECK (actual_rir BETWEEN 0 AND 10);

-- 3. Enhance ai_training_preferences with advanced fields
ALTER TABLE ai_training_preferences
  ADD COLUMN IF NOT EXISTS recovery_profile JSONB DEFAULT '{
    "job_stress": "moderate",
    "life_stress": "low",
    "average_sleep_hours": 7
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS focus_areas JSONB DEFAULT '{
    "upper_body": ["chest", "back"],
    "lower_body": ["quads", "hamstrings"]
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS lifting_styles JSONB DEFAULT '{
    "squat": "high_bar",
    "deadlift": "conventional",
    "bench": "flat"
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS current_1rm JSONB DEFAULT '{
    "squat": null,
    "bench": null,
    "deadlift": null,
    "overhead_press": null
  }'::jsonb;

-- 4. Add training_days array to support specific training days (e.g., Mon=1, Wed=3, Fri=5)
ALTER TABLE ai_training_preferences 
  ADD COLUMN IF NOT EXISTS training_days INTEGER[] DEFAULT ARRAY[1,3,5];

-- Add indexes for performance on workout_logs queries
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_exercise_date 
  ON workout_logs(user_id, exercise_name, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date 
  ON workout_logs(user_id, performed_at DESC);