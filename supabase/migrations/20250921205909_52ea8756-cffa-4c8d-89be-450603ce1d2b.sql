-- Добавляем личные цели пользователя Anton
-- Получаем ID пользователя Anton (предполагаем, что это единственный активный пользователь)
INSERT INTO public.goals (user_id, goal_name, goal_type, target_value, target_unit, is_personal) 
SELECT 
  'a527db40-3f7f-448f-8782-da632711e818',
  goal_name,
  goal_type,
  target_value,
  target_unit,
  true
FROM (VALUES
  ('Гребля 2 км', 'endurance', 510, 'сек'),  -- 8:30 в секундах
  ('Бег 1 км', 'endurance', 240, 'сек'),     -- 4:00 в секундах
  ('Подтягивания', 'strength', 17, 'раз'),
  ('Жим лёжа', 'strength', 90, 'кг'),
  ('Выпады назад со штангой', 'strength', 50, 'кг×8'),
  ('Планка', 'endurance', 4, 'мин'),
  ('Отжимания', 'strength', 60, 'раз'),
  ('Подъём ног в висе до перекладины', 'strength', 17, 'раз'),
  ('VO₂max', 'health', 50, 'мл/кг/мин'),
  ('Процент жира', 'body', 11, '%')
) AS goals_data(goal_name, goal_type, target_value, target_unit)
ON CONFLICT DO NOTHING;