-- Добавляем уникальное ограничение для предотвращения дублирования данных Withings
-- Это поможет избежать ошибок "ON CONFLICT" в будущем
ALTER TABLE metric_values 
ADD CONSTRAINT unique_metric_values_external 
UNIQUE (user_id, metric_id, measurement_date, external_id);

-- Также добавляем индекс для лучшей производительности поиска по external_id
CREATE INDEX IF NOT EXISTS idx_metric_values_external_id 
ON metric_values (external_id) 
WHERE external_id IS NOT NULL;