-- Сначала удаляем дубликаты статических метрик (оставляем самую свежую запись)
DELETE FROM metric_values a
USING metric_values b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.metric_id = b.metric_id
  AND a.external_id = b.external_id
  AND a.external_id IN ('whoop_height', 'whoop_weight', 'whoop_max_hr');

-- Теперь добавляем уникальный индекс для статических метрик (без даты)
CREATE UNIQUE INDEX IF NOT EXISTS idx_metric_values_user_metric_external 
ON metric_values(user_id, metric_id, external_id)
WHERE external_id IS NOT NULL;