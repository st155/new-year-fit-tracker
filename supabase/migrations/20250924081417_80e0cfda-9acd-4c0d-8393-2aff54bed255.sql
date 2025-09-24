-- Добавляем тестовых пользователей-клиентов
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'client1@test.com', '$2a$10$dummy_hash_for_testing', now(), now(), now(), '{"username": "client1", "full_name": "Анна Петрова"}'),
  ('550e8400-e29b-41d4-a716-446655440002', 'client2@test.com', '$2a$10$dummy_hash_for_testing', now(), now(), now(), '{"username": "client2", "full_name": "Михаил Сидоров"}'),
  ('550e8400-e29b-41d4-a716-446655440003', 'client3@test.com', '$2a$10$dummy_hash_for_testing', now(), now(), now(), '{"username": "client3", "full_name": "Елена Иванова"}')
ON CONFLICT (id) DO NOTHING;

-- Добавляем профили для тестовых клиентов
INSERT INTO public.profiles (user_id, username, full_name)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'client1', 'Анна Петрова'),
  ('550e8400-e29b-41d4-a716-446655440002', 'client2', 'Михаил Сидоров'),
  ('550e8400-e29b-41d4-a716-446655440003', 'client3', 'Елена Иванова')
ON CONFLICT (user_id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name;

-- Связываем тренера с клиентами
INSERT INTO public.trainer_clients (trainer_id, client_id, assigned_at, active)
VALUES 
  ('5dd1fbb5-e11a-4a01-93f4-b9cadf7b97bb', '550e8400-e29b-41d4-a716-446655440001', now() - interval '30 days', true),
  ('5dd1fbb5-e11a-4a01-93f4-b9cadf7b97bb', '550e8400-e29b-41d4-a716-446655440002', now() - interval '20 days', true),
  ('5dd1fbb5-e11a-4a01-93f4-b9cadf7b97bb', '550e8400-e29b-41d4-a716-446655440003', now() - interval '10 days', true)
ON CONFLICT (trainer_id, client_id) DO NOTHING;

-- Добавляем цели для клиентов
INSERT INTO public.goals (user_id, goal_name, goal_type, target_value, target_unit, is_personal, created_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Потеря веса', 'weight_loss', 70, 'кг', true, now() - interval '25 days'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Подтягивания', 'strength', 20, 'раз', true, now() - interval '25 days'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Набор мышечной массы', 'muscle_gain', 80, 'кг', true, now() - interval '15 days'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Бег 5км', 'endurance', 25, 'мин', true, now() - interval '15 days'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Процент жира', 'body_fat', 18, '%', true, now() - interval '5 days'),
  ('550e8400-e29b-41d4-a716-446655440003', 'VO2 Max', 'cardio', 45, 'мл/кг/мин', true, now() - interval '5 days');

-- Добавляем измерения для демонстрации прогресса
INSERT INTO public.measurements (user_id, goal_id, value, unit, measurement_date, source, created_at)
SELECT 
  g.user_id,
  g.id,
  CASE 
    WHEN g.goal_name = 'Потеря веса' THEN 78 - (random() * 8)
    WHEN g.goal_name = 'Подтягивания' THEN 5 + (random() * 15)
    WHEN g.goal_name = 'Набор мышечной массы' THEN 75 + (random() * 5)
    WHEN g.goal_name = 'Бег 5км' THEN 35 - (random() * 10)
    WHEN g.goal_name = 'Процент жира' THEN 25 - (random() * 7)
    WHEN g.goal_name = 'VO2 Max' THEN 35 + (random() * 10)
  END,
  g.target_unit,
  current_date - interval '1 day' * floor(random() * 20),
  'manual',
  now() - interval '1 day' * floor(random() * 20)
FROM public.goals g
WHERE g.user_id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003');

-- Добавляем дополнительные измерения для показа прогресса
INSERT INTO public.measurements (user_id, goal_id, value, unit, measurement_date, source, created_at)
SELECT 
  g.user_id,
  g.id,
  CASE 
    WHEN g.goal_name = 'Потеря веса' THEN 73 - (random() * 3)
    WHEN g.goal_name = 'Подтягивания' THEN 10 + (random() * 10)
    WHEN g.goal_name = 'Набор мышечной массы' THEN 77 + (random() * 3)
    WHEN g.goal_name = 'Бег 5км' THEN 30 - (random() * 5)
    WHEN g.goal_name = 'Процент жира' THEN 20 - (random() * 2)
    WHEN g.goal_name = 'VO2 Max' THEN 40 + (random() * 5)
  END,
  g.target_unit,
  current_date,
  'manual',
  now()
FROM public.goals g
WHERE g.user_id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003');

-- Добавляем данные здоровья для клиентов
INSERT INTO public.daily_health_summary (user_id, date, steps, heart_rate_avg, weight, active_calories, exercise_minutes)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', current_date - 1, 8500, 72, 74.5, 320, 45),
  ('550e8400-e29b-41d4-a716-446655440001', current_date - 2, 9200, 75, 74.8, 380, 60),
  ('550e8400-e29b-41d4-a716-446655440002', current_date - 1, 12000, 68, 78.2, 450, 75),
  ('550e8400-e29b-41d4-a716-446655440002', current_date - 2, 11500, 70, 78.0, 420, 65),
  ('550e8400-e29b-41d4-a716-446655440003', current_date - 1, 7800, 80, 68.5, 280, 30),
  ('550e8400-e29b-41d4-a716-446655440003', current_date - 2, 8200, 78, 68.7, 300, 35);