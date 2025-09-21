-- Создаем тестовый челлендж для демонстрации функционала
INSERT INTO public.challenges (
  title,
  description,
  start_date,
  end_date,
  created_by,
  is_active
) VALUES (
  'Фитнес к Новому Году 2025',
  'Укрепляем здоровье и формируем красивое тело к праздникам! Тренировки 3-4 раза в неделю, здоровое питание и трекинг прогресса.',
  '2024-11-01',
  '2024-12-31',
  '00000000-0000-0000-0000-000000000000',
  true
),
(
  'Марафон "Стальной пресс"',
  'Специальная программа для укрепления мышц кора. Ежедневные упражнения на пресс по 15-30 минут.',
  '2024-11-15',
  '2025-01-15',
  '00000000-0000-0000-0000-000000000000',
  true
),
(
  'Зимний кардио-вызов',
  'Повышаем выносливость и сжигаем калории! Кардио тренировки на свежем воздухе или в зале.',
  '2024-12-01',
  '2025-02-28',
  '00000000-0000-0000-0000-000000000000',
  true
);

-- Создаем общие цели для челленджей
INSERT INTO public.goals (
  goal_name,
  goal_type,
  target_value,
  target_unit,
  challenge_id,
  is_personal,
  user_id
) 
SELECT 
  'Снижение веса',
  'weight_loss',
  5,
  'кг',
  c.id,
  false,
  null
FROM public.challenges c 
WHERE c.title = 'Фитнес к Новому Году 2025';

INSERT INTO public.goals (
  goal_name,
  goal_type,
  target_value,
  target_unit,
  challenge_id,
  is_personal,
  user_id
) 
SELECT 
  'Упражнения на пресс',
  'exercise_count',
  1000,
  'повторений',
  c.id,
  false,
  null
FROM public.challenges c 
WHERE c.title = 'Марафон "Стальной пресс"';

INSERT INTO public.goals (
  goal_name,
  goal_type,
  target_value,
  target_unit,
  challenge_id,
  is_personal,
  user_id
) 
SELECT 
  'Кардио тренировки',
  'cardio_minutes',
  1200,
  'минут',
  c.id,
  false,
  null
FROM public.challenges c 
WHERE c.title = 'Зимний кардио-вызов';