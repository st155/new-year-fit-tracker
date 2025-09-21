-- Создаем профиль для пользователя без профиля с уникальным именем
INSERT INTO public.profiles (user_id, username, full_name)
SELECT 
  u.id,
  CONCAT(split_part(u.email, '@', 1), '_', EXTRACT(EPOCH FROM u.created_at)::text),
  split_part(u.email, '@', 1)
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.id IS NULL;

-- Создаем челлендж "Кубики к Новому Году" только если его еще нет
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.challenges WHERE title = 'Кубики к Новому Году') THEN
    INSERT INTO public.challenges (
      title,
      description,
      start_date,
      end_date,
      created_by,
      is_active
    ) VALUES (
      'Кубики к Новому Году',
      'Персональный челлендж для достижения топ-10% физической формы среди мужчин. Включает силовые показатели, выносливость и состав тела.',
      CURRENT_DATE,
      '2025-12-31',
      (SELECT user_id FROM public.profiles ORDER BY created_at DESC LIMIT 1),
      true
    );
  END IF;
END $$;

-- Создаем цели и присоединяем к челленджу
DO $$
DECLARE
  challenge_uuid UUID;
  user_uuid UUID;
BEGIN
  -- Получаем ID челленджа
  SELECT id INTO challenge_uuid FROM public.challenges WHERE title = 'Кубики к Новому Году' ORDER BY created_at DESC LIMIT 1;
  
  -- Получаем ID последнего зарегистрированного пользователя
  SELECT user_id INTO user_uuid FROM public.profiles ORDER BY created_at DESC LIMIT 1;
  
  -- Удаляем старые цели этого пользователя для этого челленджа
  DELETE FROM public.goals WHERE challenge_id = challenge_uuid AND user_id = user_uuid;
  
  -- Создаем новые цели для челленджа
  INSERT INTO public.goals (challenge_id, user_id, goal_name, goal_type, target_value, target_unit, is_personal) VALUES
  (challenge_uuid, user_uuid, 'Гребля 2 км', 'cardio', 8.5, 'мин', true),
  (challenge_uuid, user_uuid, 'Бег 1 км', 'cardio', 4.0, 'мин', true),
  (challenge_uuid, user_uuid, 'Подтягивания', 'strength', 17, 'раз', true),
  (challenge_uuid, user_uuid, 'Жим лёжа', 'strength', 90, 'кг', true),
  (challenge_uuid, user_uuid, 'Выпады назад со штангой', 'strength', 50, 'кг x8', true),
  (challenge_uuid, user_uuid, 'Планка', 'endurance', 4.0, 'мин', true),
  (challenge_uuid, user_uuid, 'Отжимания', 'strength', 60, 'раз', true),
  (challenge_uuid, user_uuid, 'Подъём ног в висе', 'strength', 17, 'раз', true),
  (challenge_uuid, user_uuid, 'VO₂max', 'cardio', 50, 'мл/кг/мин', true),
  (challenge_uuid, user_uuid, 'Процент жира', 'body_composition', 11, '%', true);
  
  -- Присоединяем пользователя к челленджу если еще не присоединен
  INSERT INTO public.challenge_participants (user_id, challenge_id) 
  VALUES (user_uuid, challenge_uuid)
  ON CONFLICT DO NOTHING;
END $$;