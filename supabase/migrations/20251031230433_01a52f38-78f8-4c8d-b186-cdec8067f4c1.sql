-- Create RPC to get trainer schedule events with client and training plan details
-- This bypasses RLS issues with foreign key JOINs

CREATE OR REPLACE FUNCTION get_trainer_schedule_events(
  p_trainer_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  trainer_id UUID,
  client_id UUID,
  training_plan_id UUID,
  event_type TEXT,
  title TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  is_completed BOOLEAN,
  is_cancelled BOOLEAN,
  recurrence_rule TEXT,
  reminder_minutes INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  client_user_id UUID,
  client_username TEXT,
  client_full_name TEXT,
  client_avatar_url TEXT,
  training_plan_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tse.id,
    tse.trainer_id,
    tse.client_id,
    tse.training_plan_id,
    tse.event_type,
    tse.title,
    tse.description,
    tse.start_time,
    tse.end_time,
    tse.location,
    tse.is_completed,
    tse.is_cancelled,
    tse.recurrence_rule,
    tse.reminder_minutes,
    tse.metadata,
    tse.created_at,
    tse.updated_at,
    p.user_id as client_user_id,
    p.username as client_username,
    p.full_name as client_full_name,
    p.avatar_url as client_avatar_url,
    tp.name as training_plan_name
  FROM trainer_schedule_events tse
  LEFT JOIN profiles p ON p.user_id = tse.client_id
  LEFT JOIN training_plans tp ON tp.id = tse.training_plan_id
  WHERE tse.trainer_id = p_trainer_id
    AND (p_start_date IS NULL OR tse.start_time >= p_start_date)
    AND (p_end_date IS NULL OR tse.start_time <= p_end_date)
  ORDER BY tse.start_time ASC;
END;
$$;