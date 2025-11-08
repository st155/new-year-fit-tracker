-- Создаем новый челлендж Recovery & Sleep Challenge
DO $$
DECLARE
  v_challenge_id UUID;
  v_trainer_id UUID;
BEGIN
  -- Получаем первого доступного тренера (для демонстрации)
  SELECT user_id INTO v_trainer_id 
  FROM profiles 
  WHERE trainer_role = true 
  LIMIT 1;

  -- Если нет тренера, берем первого пользователя
  IF v_trainer_id IS NULL THEN
    SELECT user_id INTO v_trainer_id 
    FROM profiles 
    LIMIT 1;
  END IF;

  -- Вставляем новый челлендж
  INSERT INTO public.challenges (
    id,
    title,
    description,
    start_date,
    end_date,
    created_by,
    is_active
  ) VALUES (
    gen_random_uuid(),
    'Recovery & Sleep Challenge',
    'Focus on recovery and sleep quality. Improve your sleep efficiency, recovery scores, and overall wellness through better rest and stress management. Join us to prioritize your body''s natural healing processes!',
    '2025-01-15',
    '2025-03-31',
    v_trainer_id,
    true
  )
  RETURNING id INTO v_challenge_id;

  -- Добавляем дисциплины для челленджа
  INSERT INTO public.challenge_disciplines (
    challenge_id,
    discipline_name,
    discipline_type,
    benchmark_value,
    unit,
    position
  ) VALUES
    (v_challenge_id, 'Sleep Efficiency', 'percentage', 85, '%', 0),
    (v_challenge_id, 'Recovery Score', 'points', 80, 'score', 1),
    (v_challenge_id, 'Sleep Duration', 'time', 8, 'hours', 2),
    (v_challenge_id, 'Resting Heart Rate', 'lower_better', 55, 'bpm', 3),
    (v_challenge_id, 'HRV', 'points', 60, 'ms', 4),
    (v_challenge_id, 'Stress Level', 'lower_better', 30, 'score', 5);

  -- Добавляем создателя как тренера
  INSERT INTO public.challenge_trainers (
    challenge_id,
    trainer_id,
    role
  ) VALUES (
    v_challenge_id,
    v_trainer_id,
    'owner'
  );

END $$;
