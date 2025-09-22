-- Исправляем время бега: 4.40 = 4 минуты 40 секунд
-- В десятичном виде это 4 + 40/60 = 4.67 минут
UPDATE measurements 
SET value = 4.40,
    notes = 'Время: 4 минуты 40 секунд (формат MM.SS)'
WHERE goal_id = '46da0aad-826d-484b-8fc0-422c8991b3bf' 
  AND measurement_date = '2025-09-21';