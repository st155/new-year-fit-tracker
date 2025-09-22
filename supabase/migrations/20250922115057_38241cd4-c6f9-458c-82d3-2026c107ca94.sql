-- Удаляем все данные Withings для неправильного пользователя
-- Сначала удаляем metric_values, которые ссылаются на user_metrics
DELETE FROM metric_values 
WHERE metric_id IN (
  SELECT id FROM user_metrics 
  WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818' 
  AND source = 'withings'
);

-- Удаляем user_metrics для Withings
DELETE FROM user_metrics 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818' 
AND source = 'withings';

-- Удаляем withings_tokens для этого пользователя
DELETE FROM withings_tokens 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818';

-- Удаляем состояния OAuth для этого пользователя
DELETE FROM withings_oauth_states 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818';

-- Удаляем workouts для Withings этого пользователя (если есть)
DELETE FROM workouts 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818' 
AND source = 'withings';