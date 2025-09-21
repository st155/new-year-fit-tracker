-- Создаем челлендж "Кубики к Новому Году"
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
  (SELECT id FROM auth.users LIMIT 1),
  true
);

-- Получаем ID созданного челленджа и пользователя
DO $$
DECLARE
  challenge_uuid UUID;
  user_uuid UUID;
BEGIN
  -- Получаем ID челленджа
  SELECT id INTO challenge_uuid FROM public.challenges WHERE title = 'Кубики к Новому Году' LIMIT 1;
  
  -- Получаем ID пользователя
  SELECT id INTO user_uuid FROM auth.users LIMIT 1;
  
  -- Создаем цели для челленджа
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
  
  -- Присоединяем пользователя к челленджу
  INSERT INTO public.challenge_participants (user_id, challenge_id) VALUES (user_uuid, challenge_uuid);
END $$;