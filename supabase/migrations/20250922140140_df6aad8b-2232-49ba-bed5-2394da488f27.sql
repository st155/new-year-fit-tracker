-- Удаляем дубликат "Подъём ног в висе до перекладины" (более специфичная версия)
DELETE FROM goals WHERE id = 'ee022fc1-9206-4aa2-a000-04aec883caa8';

-- Добавляем реальные данные о проценте жира из Withings в measurements
INSERT INTO measurements (user_id, goal_id, value, unit, measurement_date, notes, source)
VALUES (
  'a527db40-3f7f-448f-8782-da632711e818',
  '2f52c93a-99f0-4657-96db-8be118abdf9f',
  21.7,
  '%',
  '2025-09-21',
  'Данные из Withings',
  'withings'
);