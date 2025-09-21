-- Создаем общие цели для челленджей
INSERT INTO public.goals (
  goal_name,
  goal_type,
  target_value,
  target_unit,
  challenge_id,
  is_personal
) 
SELECT 
  'Снижение веса',
  'weight_loss',
  5,
  'кг',
  c.id,
  false
FROM public.challenges c 
WHERE c.title = 'Фитнес к Новому Году 2025'
LIMIT 1;

INSERT INTO public.goals (
  goal_name,
  goal_type,
  target_value,
  target_unit,
  challenge_id,
  is_personal
) 
SELECT 
  'Упражнения на пресс',
  'exercise_count',
  1000,
  'повторений',
  c.id,
  false
FROM public.challenges c 
WHERE c.title = 'Марафон "Стальной пресс"'
LIMIT 1;

INSERT INTO public.goals (
  goal_name,
  goal_type,
  target_value,
  target_unit,
  challenge_id,
  is_personal
) 
SELECT 
  'Кардио тренировки',
  'cardio_minutes',
  1200,
  'минут',
  c.id,
  false
FROM public.challenges c 
WHERE c.title = 'Зимний кардио-вызов'
LIMIT 1;