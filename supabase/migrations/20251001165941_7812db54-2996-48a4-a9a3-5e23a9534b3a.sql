-- Удаляем дублирующиеся триггеры, оставляя только один на таблицу

-- Goals - удаляем 2 из 3
DROP TRIGGER IF EXISTS activity_feed_goal_trigger ON goals;
DROP TRIGGER IF EXISTS create_activity_feed_from_goals ON goals;
-- Оставляем: trg_activity_feed_goals

-- Measurements - удаляем 2 из 3  
DROP TRIGGER IF EXISTS activity_feed_measurement_trigger ON measurements;
DROP TRIGGER IF EXISTS create_activity_feed_from_measurements ON measurements;
-- Оставляем: trg_activity_feed_measurements

-- Body Composition - удаляем 2 из 3
DROP TRIGGER IF EXISTS activity_feed_body_composition_trigger ON body_composition;
DROP TRIGGER IF EXISTS create_activity_feed_from_body_composition ON body_composition;
-- Оставляем: trg_activity_feed_body_composition

-- Metric Values - удаляем 2 из 3
DROP TRIGGER IF EXISTS create_activity_feed_from_metric_values ON metric_values;
DROP TRIGGER IF EXISTS create_metric_values_activity ON metric_values;
-- Оставляем: trg_activity_feed_metric_values

-- Workouts - удаляем 2 из 3
DROP TRIGGER IF EXISTS activity_feed_workout_trigger ON workouts;
DROP TRIGGER IF EXISTS create_activity_feed_from_workouts ON workouts;
-- Оставляем: trg_activity_feed_workouts