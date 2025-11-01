-- ============================================================================
-- PROMPT 1: DATABASE REFACTOR V2.0 - SINGLE SOURCE OF TRUTH
-- ============================================================================

-- 1.1 Extend unified_metrics to V2
-- ============================================================================
ALTER TABLE unified_metrics 
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conflict_group UUID,
  ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS confidence_factors JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for V2 columns
CREATE INDEX IF NOT EXISTS idx_um_primary 
  ON unified_metrics(user_id, metric_name, measurement_date) 
  WHERE is_primary AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_um_conflict_group 
  ON unified_metrics(conflict_group) 
  WHERE conflict_group IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_um_quality 
  ON unified_metrics(user_id, metric_name, quality_score DESC);

-- 1.2 Create metric_snapshots (Daily Aggregates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  value_avg NUMERIC,
  value_min NUMERIC,
  value_max NUMERIC,
  value_count INTEGER DEFAULT 0,
  avg_quality_score INTEGER,
  trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, snapshot_date, metric_name)
);

-- RLS for metric_snapshots
ALTER TABLE metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own snapshots" ON metric_snapshots 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Trainers view client snapshots" ON metric_snapshots 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients 
      WHERE trainer_id = auth.uid() 
        AND client_id = user_id 
        AND active = true
    )
  );

CREATE POLICY "System can manage snapshots" ON metric_snapshots 
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes for metric_snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_user_date 
  ON metric_snapshots(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_metric 
  ON metric_snapshots(metric_name, snapshot_date DESC);

-- 1.3 Normalize InBody Data
-- ============================================================================

-- Core measurements table
CREATE TABLE IF NOT EXISTS inbody_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  weight NUMERIC,
  body_fat_percentage NUMERIC,
  muscle_mass NUMERIC,
  skeletal_muscle_mass NUMERIC,
  body_fat_mass NUMERIC,
  total_body_water NUMERIC,
  protein NUMERIC,
  mineral NUMERIC,
  bmi NUMERIC,
  bmr INTEGER,
  visceral_fat_level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, test_date)
);

-- RLS for inbody_measurements
ALTER TABLE inbody_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own inbody" ON inbody_measurements 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own inbody" ON inbody_measurements 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own inbody" ON inbody_measurements 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Trainers view client inbody" ON inbody_measurements 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients 
      WHERE trainer_id = auth.uid() 
        AND client_id = user_id 
        AND active = true
    )
  );

-- Detailed segments (JSONB for flexibility)
CREATE TABLE IF NOT EXISTS inbody_detailed_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES inbody_measurements(id) ON DELETE CASCADE,
  segmental_data JSONB DEFAULT '{}',
  impedance_data JSONB DEFAULT '{}',
  research_params JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(measurement_id)
);

-- RLS for inbody_detailed_segments
ALTER TABLE inbody_detailed_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own segments" ON inbody_detailed_segments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inbody_measurements 
      WHERE id = measurement_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own segments" ON inbody_detailed_segments 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM inbody_measurements 
      WHERE id = measurement_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers view client segments" ON inbody_detailed_segments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inbody_measurements im
      JOIN trainer_clients tc ON tc.client_id = im.user_id
      WHERE im.id = measurement_id 
        AND tc.trainer_id = auth.uid() 
        AND tc.active = true
    )
  );

-- Auto-sync trigger for InBody → unified_metrics
CREATE OR REPLACE FUNCTION sync_inbody_to_unified()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Insert core metrics
  INSERT INTO unified_metrics (
    user_id, metric_name, metric_category, value, unit, 
    source, provider, measurement_date, priority, quality_score, is_primary
  ) VALUES
    (NEW.user_id, 'Weight', 'body_composition', NEW.weight, 'kg', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'Body Fat Percentage', 'body_composition', NEW.body_fat_percentage, '%', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'Muscle Mass', 'body_composition', NEW.muscle_mass, 'kg', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'Skeletal Muscle Mass', 'body_composition', NEW.skeletal_muscle_mass, 'kg', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'BMI', 'body_composition', NEW.bmi, 'kg/m²', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'BMR', 'body_composition', NEW.bmr, 'kcal', 'inbody', 'inbody', NEW.test_date, 1, 95, true)
  ON CONFLICT (user_id, metric_name, measurement_date, source) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    quality_score = EXCLUDED.quality_score,
    is_primary = EXCLUDED.is_primary,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_inbody ON inbody_measurements;
CREATE TRIGGER trigger_sync_inbody 
  AFTER INSERT OR UPDATE ON inbody_measurements
  FOR EACH ROW EXECUTE FUNCTION sync_inbody_to_unified();

-- 1.4 Create SQL Views (Security Invoker)
-- ============================================================================

-- Drop old security definer views if they exist
DROP VIEW IF EXISTS body_composition_view CASCADE;
DROP VIEW IF EXISTS sleep_analysis_view CASCADE;
DROP VIEW IF EXISTS activity_summary_view CASCADE;

-- Body Composition View
CREATE OR REPLACE VIEW body_composition_view 
WITH (security_invoker=on) AS
SELECT 
  im.user_id,
  im.test_date AS measurement_date,
  im.weight,
  im.body_fat_percentage,
  im.muscle_mass,
  im.skeletal_muscle_mass,
  im.body_fat_mass,
  im.bmi,
  im.bmr,
  im.visceral_fat_level,
  ids.segmental_data,
  ids.impedance_data,
  ids.research_params,
  im.created_at,
  im.updated_at
FROM inbody_measurements im
LEFT JOIN inbody_detailed_segments ids ON ids.measurement_id = im.id;

-- Sleep Analysis View
CREATE OR REPLACE VIEW sleep_analysis_view 
WITH (security_invoker=on) AS
SELECT 
  user_id,
  measurement_date,
  MAX(CASE WHEN metric_name = 'Sleep Duration' THEN value END) AS sleep_hours,
  MAX(CASE WHEN metric_name = 'Sleep Efficiency' THEN value END) AS sleep_efficiency,
  MAX(CASE WHEN metric_name = 'Deep Sleep' THEN value END) AS deep_sleep,
  MAX(CASE WHEN metric_name = 'REM Sleep' THEN value END) AS rem_sleep,
  MAX(CASE WHEN metric_name = 'Light Sleep' THEN value END) AS light_sleep,
  AVG(quality_score) AS avg_sleep_quality
FROM unified_metrics
WHERE metric_category = 'sleep' AND deleted_at IS NULL
GROUP BY user_id, measurement_date;

-- Activity Summary View
CREATE OR REPLACE VIEW activity_summary_view 
WITH (security_invoker=on) AS
SELECT 
  user_id,
  measurement_date,
  MAX(CASE WHEN metric_name = 'Steps' THEN value END) AS steps,
  MAX(CASE WHEN metric_name = 'Active Calories' THEN value END) AS active_calories,
  MAX(CASE WHEN metric_name = 'Distance' THEN value END) AS distance_km,
  MAX(CASE WHEN metric_name = 'Day Strain' THEN value END) AS day_strain,
  AVG(quality_score) AS avg_activity_quality
FROM unified_metrics
WHERE metric_category IN ('activity', 'workout') AND deleted_at IS NULL
GROUP BY user_id, measurement_date;

-- Recovery Metrics View
CREATE OR REPLACE VIEW recovery_metrics_view 
WITH (security_invoker=on) AS
SELECT 
  user_id,
  measurement_date,
  MAX(CASE WHEN metric_name = 'Recovery Score' THEN value END) AS recovery_score,
  MAX(CASE WHEN metric_name = 'HRV RMSSD' THEN value END) AS hrv,
  MAX(CASE WHEN metric_name = 'Resting Heart Rate' THEN value END) AS resting_hr,
  AVG(quality_score) AS avg_recovery_quality
FROM unified_metrics
WHERE metric_category = 'recovery' AND deleted_at IS NULL
GROUP BY user_id, measurement_date;

-- 1.5 Feature Flags Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert V2 feature flag
INSERT INTO feature_flags (key, enabled, description) 
VALUES ('USE_UNIFIED_V2', true, 'Enable unified_metrics V2 architecture')
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- RLS for feature_flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read feature flags" ON feature_flags 
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature flags" ON feature_flags 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 1.6 Helper function to calculate daily snapshots
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_daily_snapshots(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO metric_snapshots (
    user_id, snapshot_date, metric_name,
    value_avg, value_min, value_max, value_count, avg_quality_score
  )
  SELECT 
    user_id,
    measurement_date,
    metric_name,
    AVG(value) as value_avg,
    MIN(value) as value_min,
    MAX(value) as value_max,
    COUNT(*) as value_count,
    AVG(quality_score)::INTEGER as avg_quality_score
  FROM unified_metrics
  WHERE user_id = p_user_id
    AND measurement_date = p_date
    AND deleted_at IS NULL
  GROUP BY user_id, measurement_date, metric_name
  ON CONFLICT (user_id, snapshot_date, metric_name)
  DO UPDATE SET
    value_avg = EXCLUDED.value_avg,
    value_min = EXCLUDED.value_min,
    value_max = EXCLUDED.value_max,
    value_count = EXCLUDED.value_count,
    avg_quality_score = EXCLUDED.avg_quality_score,
    updated_at = now();
END;
$$;

COMMENT ON TABLE unified_metrics IS 'V2.0: Single Source of Truth for all metrics with quality scoring and conflict resolution';
COMMENT ON TABLE metric_snapshots IS 'V2.0: Daily aggregated snapshots for fast queries';
COMMENT ON TABLE inbody_measurements IS 'V2.0: Normalized InBody core measurements';
COMMENT ON TABLE inbody_detailed_segments IS 'V2.0: InBody detailed segmental data (JSONB)';
