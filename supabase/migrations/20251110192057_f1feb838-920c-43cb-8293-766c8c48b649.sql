-- Phase 1: Juggernaut AI Training System - Database Schema

-- 1. Create ai_training_preferences table
CREATE TABLE ai_training_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_goal TEXT NOT NULL CHECK (primary_goal IN ('strength', 'hypertrophy', 'fat_loss', 'endurance')),
  experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 2 AND 7),
  equipment JSONB NOT NULL DEFAULT '["bodyweight"]'::jsonb,
  preferred_workout_duration INTEGER,
  injuries_limitations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE ai_training_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI preferences"
  ON ai_training_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Create workout_logs table
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_plan_id UUID REFERENCES assigned_training_plans(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  exercise_category TEXT,
  prescribed_weight NUMERIC,
  prescribed_reps INTEGER,
  prescribed_rpe NUMERIC CHECK (prescribed_rpe BETWEEN 1 AND 10),
  prescribed_rest_seconds INTEGER,
  actual_weight NUMERIC NOT NULL,
  actual_reps INTEGER NOT NULL,
  actual_rpe NUMERIC NOT NULL CHECK (actual_rpe BETWEEN 1 AND 10),
  set_number INTEGER NOT NULL,
  superset_group TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workout logs"
  ON workout_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_workout_logs_user_date ON workout_logs(user_id, performed_at DESC);
CREATE INDEX idx_workout_logs_exercise ON workout_logs(exercise_name, user_id);

-- 3. Extend training_plans for AI support
ALTER TABLE training_plans 
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS generation_prompt TEXT,
  ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb;