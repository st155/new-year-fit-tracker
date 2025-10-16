-- Extend habits table with new columns for custom habit types
ALTER TABLE habits 
  ADD COLUMN IF NOT EXISTS habit_type TEXT DEFAULT 'daily_check',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS target_value NUMERIC,
  ADD COLUMN IF NOT EXISTS measurement_unit TEXT,
  ADD COLUMN IF NOT EXISTS custom_settings JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN habits.habit_type IS 'Type of habit: daily_check, duration_counter, numeric_counter, daily_measurement';
COMMENT ON COLUMN habits.start_date IS 'Start date for duration_counter type habits';
COMMENT ON COLUMN habits.target_value IS 'Target value for numeric_counter and daily_measurement habits';
COMMENT ON COLUMN habits.measurement_unit IS 'Unit of measurement (books, pages, km, etc.)';
COMMENT ON COLUMN habits.custom_settings IS 'Custom settings like cost_per_day for quit smoking';

-- Create habit_measurements table for numeric and daily measurement tracking
CREATE TABLE IF NOT EXISTS habit_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  value NUMERIC NOT NULL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, measurement_date)
);

-- Enable RLS on habit_measurements
ALTER TABLE habit_measurements ENABLE ROW LEVEL SECURITY;

-- RLS policies for habit_measurements
CREATE POLICY "Users can view their own habit measurements"
  ON habit_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit measurements"
  ON habit_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit measurements"
  ON habit_measurements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit measurements"
  ON habit_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- Create habit_attempts table for tracking resets (when user "slips up")
CREATE TABLE IF NOT EXISTS habit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  days_lasted INTEGER,
  reset_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on habit_attempts
ALTER TABLE habit_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for habit_attempts
CREATE POLICY "Users can view their own habit attempts"
  ON habit_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit attempts"
  ON habit_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit attempts"
  ON habit_attempts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit attempts"
  ON habit_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update habit_stats when measurements are added
CREATE OR REPLACE FUNCTION update_habit_stats_on_measurement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update total_completions for numeric_counter habits
  UPDATE habit_stats
  SET total_completions = (
    SELECT COUNT(*) FROM habit_measurements WHERE habit_id = NEW.habit_id
  ),
  updated_at = NOW()
  WHERE habit_id = NEW.habit_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_habit_measurement_created
  AFTER INSERT ON habit_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_habit_stats_on_measurement();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_habit_measurements_user_habit ON habit_measurements(user_id, habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_measurements_date ON habit_measurements(measurement_date);
CREATE INDEX IF NOT EXISTS idx_habit_attempts_user_habit ON habit_attempts(user_id, habit_id);