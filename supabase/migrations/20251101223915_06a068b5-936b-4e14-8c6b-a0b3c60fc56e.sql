-- Fix join_challenge function - use correct column names
CREATE OR REPLACE FUNCTION public.join_challenge(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_goals_created integer := 0;
  v_already_participant boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already participant
  SELECT EXISTS(
    SELECT 1 FROM challenge_participants 
    WHERE challenge_id = p_challenge_id AND user_id = v_user_id
  ) INTO v_already_participant;

  -- Add participant (or skip if exists)
  INSERT INTO challenge_participants (challenge_id, user_id, joined_at)
  VALUES (p_challenge_id, v_user_id, now())
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  -- Create base goals if not exist
  IF NOT EXISTS(
    SELECT 1 FROM goals 
    WHERE user_id = v_user_id 
    AND challenge_id = p_challenge_id
  ) THEN
    -- ✅ Fixed: use target_unit, removed start_date/end_date
    INSERT INTO goals (user_id, challenge_id, goal_name, goal_type, target_value, target_unit, is_personal)
    SELECT 
      v_user_id,
      p_challenge_id,
      goal_name,
      goal_type,
      target_value,
      target_unit,
      false
    FROM (
      VALUES 
        ('Шаги', 'steps', 10000, 'шаги'),
        ('Вода', 'water_intake', 2.5, 'л'),
        ('Сон', 'sleep_hours', 8, 'часы'),
        ('Тренировки', 'workouts', 5, 'раз'),
        ('Активные калории', 'calories_burned', 500, 'ккал')
    ) AS base_goals(goal_name, goal_type, target_value, target_unit);

    GET DIAGNOSTICS v_goals_created = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_participant', v_already_participant,
    'goals_created', v_goals_created,
    'user_id', v_user_id,
    'challenge_id', p_challenge_id
  );
END;
$$;