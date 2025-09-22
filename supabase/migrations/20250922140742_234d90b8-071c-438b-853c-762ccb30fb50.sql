-- Удаляем тестовые цели-дубликаты
DELETE FROM goals WHERE goal_name LIKE 'Test Goal%';

-- Проверяем и заполняем недостающие данные для VO2Max из measurements
UPDATE measurements 
SET value = 51, unit = 'мл/кг/мин', notes = 'ИИ-анализ скриншота VO2Max из Whoop', source = 'ai_analysis'
WHERE goal_id = '5cbc6b12-1363-42c2-a529-9ed39a1bba82' 
  AND measurement_date = '2025-09-22'
  AND value IS NULL;