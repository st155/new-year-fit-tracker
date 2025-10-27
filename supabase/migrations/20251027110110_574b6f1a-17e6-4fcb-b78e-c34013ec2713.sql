-- Create atomic rate limit increment function
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key text,
  p_window_start timestamptz,
  p_max_requests int,
  p_window_ms bigint
) RETURNS json AS $$
DECLARE
  v_count int;
  v_window_start timestamptz;
BEGIN
  -- Atomic upsert with increment
  INSERT INTO rate_limits (key, count, window_start, created_at)
  VALUES (p_key, 1, p_window_start, now())
  ON CONFLICT (key) DO UPDATE
  SET 
    count = CASE 
      WHEN (EXTRACT(EPOCH FROM (p_window_start - rate_limits.window_start)) * 1000) > p_window_ms
      THEN 1  -- Reset if window expired
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN (EXTRACT(EPOCH FROM (p_window_start - rate_limits.window_start)) * 1000) > p_window_ms
      THEN p_window_start
      ELSE rate_limits.window_start
    END
  RETURNING count, window_start INTO v_count, v_window_start;
  
  -- Check limit
  IF v_count > p_max_requests THEN
    RETURN json_build_object(
      'exceeded', true,
      'count', v_count,
      'reset_at', v_window_start + (p_window_ms || ' milliseconds')::interval
    );
  END IF;
  
  RETURN json_build_object(
    'exceeded', false,
    'count', v_count,
    'remaining', p_max_requests - v_count,
    'reset_at', v_window_start + (p_window_ms || ' milliseconds')::interval
  );
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_terra_tokens_terra_user_provider 
ON terra_tokens(terra_user_id, provider) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
ON rate_limits(window_start);