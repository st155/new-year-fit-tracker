-- Temporarily disable triggers, add missing goals, then re-enable
DO $$
DECLARE
  v_challenge_id UUID;
BEGIN
  -- Disable the triggers temporarily
  ALTER TABLE public.goals DISABLE TRIGGER activity_feed_on_goal;
  ALTER TABLE public.goals DISABLE TRIGGER create_activity_feed_entry_on_goal;

  -- Get the challenge ID
  SELECT id INTO v_challenge_id
  FROM public.challenges 
  WHERE title ILIKE '%New Year Six-Pack Challenge%'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update the discipline benchmark
  UPDATE public.challenge_disciplines
  SET benchmark_value = 17,
      unit = 'раз',
      discipline_type = 'strength'
  WHERE challenge_id = v_challenge_id
    AND discipline_name IN (
      'Подъём ног в висе до перекладины',
      'Подъем ног в висе до перекладины'
    );

  -- Insert missing goals for all participants
  INSERT INTO public.goals (
    user_id,
    challenge_id,
    goal_name,
    goal_type,
    target_value,
    target_unit,
    is_personal
  )
  SELECT
    cp.user_id,
    cp.challenge_id,
    'Подъём ног в висе до перекладины' as goal_name,
    'strength' as goal_type,
    17 as target_value,
    'раз' as target_unit,
    false as is_personal
  FROM public.challenge_participants cp
  WHERE cp.challenge_id = v_challenge_id
    AND NOT EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.user_id = cp.user_id
        AND g.challenge_id = cp.challenge_id
        AND g.goal_name IN (
          'Подъём ног в висе до перекладины',
          'Подъем ног в висе до перекладины'
        )
    );

  -- Re-enable the triggers
  ALTER TABLE public.goals ENABLE TRIGGER activity_feed_on_goal;
  ALTER TABLE public.goals ENABLE TRIGGER create_activity_feed_entry_on_goal;
END $$;