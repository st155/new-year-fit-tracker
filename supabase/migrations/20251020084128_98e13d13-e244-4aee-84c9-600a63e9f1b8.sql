-- Сначала удаляем все дубликаты, включая записи с некорректными датами
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    metric_id,
    measurement_date,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, metric_id, measurement_date 
      ORDER BY created_at DESC
    ) as row_num
  FROM metric_values
)
DELETE FROM metric_values
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Также удаляем записи с датой 1970-01-01 (некорректные данные)
DELETE FROM metric_values
WHERE measurement_date = '1970-01-01';

-- Теперь добавляем UNIQUE constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_metric_values_unique_per_day 
ON metric_values (user_id, metric_id, measurement_date);