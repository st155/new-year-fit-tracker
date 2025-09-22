-- Обновляем время бега на правильное значение (4 минуты 40 секунд = 4.67 минуты)
UPDATE measurements 
SET value = 4.67,
    notes = 'Текущий результат: 4 минуты 40 секунд за километр'
WHERE goal_id = '46da0aad-826d-484b-8fc0-422c8991b3bf' 
  AND measurement_date = '2025-09-21';