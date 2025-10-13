
-- Добавляем unique constraint для workouts
ALTER TABLE workouts 
ADD CONSTRAINT workouts_user_external_unique 
UNIQUE (user_id, external_id);

-- Добавляем index для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_workouts_user_date 
ON workouts(user_id, start_time DESC);
