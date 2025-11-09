-- Очистка всех привычек пользователя cee65ee0-5237-433c-a41e-79d0367fad87
-- Сначала удаляем зависимые данные
DELETE FROM habit_completions 
WHERE habit_id IN (SELECT id FROM habits WHERE user_id = 'cee65ee0-5237-433c-a41e-79d0367fad87');

DELETE FROM habit_measurements 
WHERE habit_id IN (SELECT id FROM habits WHERE user_id = 'cee65ee0-5237-433c-a41e-79d0367fad87');

DELETE FROM habit_attempts 
WHERE habit_id IN (SELECT id FROM habits WHERE user_id = 'cee65ee0-5237-433c-a41e-79d0367fad87');

DELETE FROM habit_stats 
WHERE habit_id IN (SELECT id FROM habits WHERE user_id = 'cee65ee0-5237-433c-a41e-79d0367fad87');

-- Затем удаляем сами привычки
DELETE FROM habits 
WHERE user_id = 'cee65ee0-5237-433c-a41e-79d0367fad87';