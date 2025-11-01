-- Create trainer notification settings table
CREATE TABLE IF NOT EXISTS trainer_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Email notifications
  email_enabled BOOLEAN DEFAULT TRUE,
  email_integration_issues BOOLEAN DEFAULT TRUE,
  email_client_alerts BOOLEAN DEFAULT TRUE,
  email_daily_digest BOOLEAN DEFAULT FALSE,
  
  -- Push notifications (future)
  push_enabled BOOLEAN DEFAULT FALSE,
  
  -- Digest frequency
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly', 'never')),
  digest_time TIME DEFAULT '09:00:00',
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE trainer_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Trainers manage their notification settings"
  ON trainer_notification_settings
  FOR ALL
  USING (trainer_id = auth.uid());

-- Index
CREATE INDEX idx_trainer_notification_settings_trainer ON trainer_notification_settings(trainer_id);

-- Trigger for updated_at
CREATE TRIGGER update_trainer_notification_settings_updated_at
  BEFORE UPDATE ON trainer_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- SQL function: get stale integrations (>7 days without data)
CREATE OR REPLACE FUNCTION get_stale_integrations()
RETURNS TABLE (
  trainer_id UUID,
  client_id UUID,
  full_name TEXT,
  source TEXT,
  days_stale INT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH last_sync AS (
    SELECT 
      um.user_id,
      um.source,
      MAX(um.measurement_date) as last_date,
      EXTRACT(DAY FROM NOW() - MAX(um.measurement_date))::INT as days_since
    FROM unified_metrics um
    WHERE um.source IN ('whoop', 'oura', 'garmin', 'withings')
    GROUP BY um.user_id, um.source
    HAVING MAX(um.measurement_date) < NOW() - INTERVAL '7 days'
  )
  SELECT 
    tc.trainer_id,
    tc.client_id,
    p.full_name,
    ls.source,
    ls.days_since
  FROM trainer_clients tc
  JOIN profiles p ON p.id = tc.client_id
  JOIN last_sync ls ON ls.user_id = tc.client_id
  WHERE tc.active = TRUE;
END;
$$;

-- SQL function: get overtrained clients (high strain + low recovery)
CREATE OR REPLACE FUNCTION get_overtrained_clients()
RETURNS TABLE (
  trainer_id UUID,
  client_id UUID,
  full_name TEXT,
  avg_strain NUMERIC,
  avg_recovery NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH recent_metrics AS (
    SELECT 
      user_id,
      AVG(CASE WHEN metric_name = 'Day Strain' THEN value END) as strain,
      AVG(CASE WHEN metric_name = 'Recovery Score' THEN value END) as recovery
    FROM unified_metrics
    WHERE measurement_date >= NOW() - INTERVAL '2 days'
      AND metric_name IN ('Day Strain', 'Recovery Score')
    GROUP BY user_id
    HAVING 
      AVG(CASE WHEN metric_name = 'Day Strain' THEN value END) > 18
      AND AVG(CASE WHEN metric_name = 'Recovery Score' THEN value END) < 33
  )
  SELECT 
    tc.trainer_id,
    tc.client_id,
    p.full_name,
    ROUND(rm.strain, 1),
    ROUND(rm.recovery, 0)
  FROM trainer_clients tc
  JOIN profiles p ON p.id = tc.client_id
  JOIN recent_metrics rm ON rm.user_id = tc.client_id
  WHERE tc.active = TRUE;
END;
$$;