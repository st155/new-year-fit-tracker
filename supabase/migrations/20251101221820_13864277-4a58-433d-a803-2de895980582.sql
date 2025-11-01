-- Create server-side function to join challenge and auto-create goals
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
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already a participant
  SELECT EXISTS(
    SELECT 1 FROM challenge_participants 
    WHERE challenge_id = p_challenge_id AND user_id = v_user_id
  ) INTO v_already_participant;

  -- Insert into challenge_participants (idempotent)
  INSERT INTO challenge_participants (challenge_id, user_id, joined_at)
  VALUES (p_challenge_id, v_user_id, now())
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  -- Only create goals if user has no goals for this challenge
  IF NOT EXISTS(
    SELECT 1 FROM goals 
    WHERE user_id = v_user_id 
    AND challenge_id = p_challenge_id
  ) THEN
    -- Create base goals for the challenge
    INSERT INTO goals (user_id, challenge_id, goal_name, goal_type, target_value, unit, is_personal, start_date, end_date)
    SELECT 
      v_user_id,
      p_challenge_id,
      goal_name,
      goal_type,
      target_value,
      unit,
      false,
      c.start_date,
      c.end_date
    FROM (
      VALUES 
        ('Шаги', 'steps', 10000, 'шаги'),
        ('Вода', 'water_intake', 2.5, 'л'),
        ('Сон', 'sleep_hours', 8, 'часы'),
        ('Тренировки', 'workouts', 5, 'раз'),
        ('Активные калории', 'calories_burned', 500, 'ккал')
    ) AS base_goals(goal_name, goal_type, target_value, unit)
    CROSS JOIN challenges c
    WHERE c.id = p_challenge_id;

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_challenge(uuid) TO authenticated;

COMMENT ON FUNCTION public.join_challenge(uuid) IS 'Join a challenge and auto-create base goals if needed';

-- Create index for faster goal lookups by challenge
CREATE INDEX IF NOT EXISTS idx_goals_challenge_user ON goals(challenge_id, user_id) WHERE challenge_id IS NOT NULL;