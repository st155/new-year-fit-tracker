-- Удаляем дубликат VO2Max с goal_type='cardio' (без измерений)
DELETE FROM goals WHERE id = 'ef8b6537-070d-45b4-95b7-7640c0c06894';

-- Удаляем дубликат "Бег 1 км" с goal_type='endurance' (без измерений) 
DELETE FROM goals WHERE id = '4c0adfad-22ef-4705-a40f-2f9d438e8559';

-- Удаляем дубликат "Гребля 2 км" с goal_type='endurance' (без измерений)
DELETE FROM goals WHERE id = '9cc62ab7-4873-4d80-b3f9-17ef2675a8f9';

-- Удаляем дубликат "Процент жира" с goal_type='body' (без измерений)
DELETE FROM goals WHERE id = '1d22ce1b-8fcc-4573-ab50-e9498c057d3c';

-- Вставляем данные VO2Max из metric_values в measurements для цели VO2Max
INSERT INTO measurements (user_id, goal_id, value, unit, measurement_date, notes, source)
SELECT 
  mv.user_id,
  '5cbc6b12-1363-42c2-a529-9ed39a1bba82' as goal_id,
  mv.value,
  'мл/кг/мин' as unit,
  mv.measurement_date,
  mv.notes,
  'ai_analysis' as source
FROM metric_values mv
JOIN user_metrics um ON mv.metric_id = um.id
WHERE mv.user_id = 'a527db40-3f7f-448f-8782-da632711e818' 
  AND um.metric_name = 'VO2Max'
  AND NOT EXISTS (
    SELECT 1 FROM measurements m 
    WHERE m.goal_id = '5cbc6b12-1363-42c2-a529-9ed39a1bba82' 
    AND m.measurement_date = mv.measurement_date
    AND m.value = mv.value
  );