-- Очистка всех данных интеграций
-- Удаляем все токены Whoop
DELETE FROM whoop_tokens;

-- Удаляем все токены Withings  
DELETE FROM withings_tokens;

-- Удаляем все состояния OAuth для Whoop
DELETE FROM whoop_oauth_states;

-- Удаляем все состояния OAuth для Withings
DELETE FROM withings_oauth_states;

-- Удаляем все метрики из интеграций
DELETE FROM metric_values WHERE metric_id IN (
  SELECT id FROM user_metrics WHERE source IN ('whoop', 'withings')
);

-- Удаляем сами метрики интеграций
DELETE FROM user_metrics WHERE source IN ('whoop', 'withings');

-- Удаляем записи здоровья из интеграций
DELETE FROM health_records WHERE source_name IN ('whoop', 'withings');

-- Удаляем тренировки из интеграций
DELETE FROM workouts WHERE source IN ('whoop', 'withings');