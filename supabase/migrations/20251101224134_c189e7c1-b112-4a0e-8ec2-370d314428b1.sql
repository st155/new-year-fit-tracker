-- Create admin function to backfill goals for existing participants
CREATE OR REPLACE FUNCTION public.backfill_challenge_goals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_total_fixed integer := 0;
  v_total_goals_created integer := 0;
  v_goals_for_participant integer := 0;
BEGIN
  -- Find all participants without goals
  FOR v_participant IN
    SELECT DISTINCT cp.user_id, cp.challenge_id
    FROM challenge_participants cp
    LEFT JOIN goals g ON g.user_id = cp.user_id AND g.challenge_id = cp.challenge_id
    WHERE g.id IS NULL
  LOOP
    -- Create base goals for this participant
    INSERT INTO goals (user_id, challenge_id, goal_name, goal_type, target_value, target_unit, is_personal)
    VALUES 
      (v_participant.user_id, v_participant.challenge_id, 'Шаги', 'steps', 10000, 'шаги', false),
      (v_participant.user_id, v_participant.challenge_id, 'Вода', 'water_intake', 2.5, 'л', false),
      (v_participant.user_id, v_participant.challenge_id, 'Сон', 'sleep_hours', 8, 'часы', false),
      (v_participant.user_id, v_participant.challenge_id, 'Тренировки', 'workouts', 5, 'раз', false),
      (v_participant.user_id, v_participant.challenge_id, 'Активные калории', 'calories_burned', 500, 'ккал', false);
    
    GET DIAGNOSTICS v_goals_for_participant = ROW_COUNT;
    v_total_fixed := v_total_fixed + 1;
    v_total_goals_created := v_total_goals_created + v_goals_for_participant;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'participants_fixed', v_total_fixed,
    'goals_created', v_total_goals_created
  );
END;
$$;

-- Grant execute to authenticated users (can be restricted to admin only if needed)
GRANT EXECUTE ON FUNCTION public.backfill_challenge_goals() TO authenticated;