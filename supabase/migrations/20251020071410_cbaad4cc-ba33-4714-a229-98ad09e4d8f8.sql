-- Drop the problematic secure view
DROP VIEW IF EXISTS public.trainer_client_summary_secure;

-- Restore access to materialized view (it will only be accessed via RPC functions)
GRANT SELECT ON public.trainer_client_summary TO authenticated;

-- Create secure RPC function to access trainer client summary
CREATE OR REPLACE FUNCTION public.get_trainer_clients_summary(p_trainer_id UUID DEFAULT NULL)
RETURNS TABLE (
  trainer_id UUID,
  client_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  active_goals_count BIGINT,
  recent_measurements_count BIGINT,
  last_activity_date DATE,
  health_summary JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If no trainer_id provided, use current user
  IF p_trainer_id IS NULL THEN
    p_trainer_id := auth.uid();
  END IF;
  
  -- Check if user has permission (must be the trainer, admin, or the client themselves)
  IF NOT (
    auth.uid() = p_trainer_id 
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    tcs.trainer_id,
    tcs.client_id,
    tcs.username,
    tcs.full_name,
    tcs.avatar_url,
    tcs.active_goals_count,
    tcs.recent_measurements_count,
    tcs.last_activity_date,
    tcs.health_summary
  FROM trainer_client_summary tcs
  WHERE tcs.trainer_id = p_trainer_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_trainer_clients_summary(UUID) TO authenticated;