-- Create secure function to get client unified metrics
-- This function wraps get_unified_metrics with trainer access control
CREATE OR REPLACE FUNCTION public.get_client_unified_metrics_secure(
  p_user_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_unified_metric_name text DEFAULT NULL
)
RETURNS TABLE(
  unified_metric_name text,
  unified_category text,
  unified_unit text,
  aggregated_value numeric,
  measurement_date date,
  source_count integer,
  sources text[],
  source_values jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller has access to this user's data
  IF NOT (
    auth.uid() = p_user_id
    OR EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id = p_user_id
        AND active = true
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Access denied to user metrics';
  END IF;

  -- Return the unified metrics
  RETURN QUERY
  SELECT * FROM get_unified_metrics(p_user_id, p_start_date, p_end_date, p_unified_metric_name);
END;
$$;