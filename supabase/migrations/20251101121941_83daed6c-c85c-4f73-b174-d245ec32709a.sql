-- Fix security warning for calculate_streak_days function
CREATE OR REPLACE FUNCTION calculate_streak_days(p_user_id UUID, p_end_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_current_date DATE := p_end_date;
  v_has_data BOOLEAN;
BEGIN
  LOOP
    -- Check if user has any metrics for current date
    SELECT EXISTS(
      SELECT 1 FROM unified_metrics
      WHERE user_id = p_user_id 
      AND measurement_date = v_current_date
    ) INTO v_has_data;
    
    EXIT WHEN NOT v_has_data;
    
    v_streak := v_streak + 1;
    v_current_date := v_current_date - INTERVAL '1 day';
  END LOOP;
  
  RETURN v_streak;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public;