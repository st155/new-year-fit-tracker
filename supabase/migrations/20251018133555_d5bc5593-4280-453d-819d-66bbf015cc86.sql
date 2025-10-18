-- Очистка дубликатов Recovery Score
-- Оставляем только последнюю запись (MAX created_at) для каждой комбинации user_id + measurement_date

DELETE FROM metric_values
WHERE id IN (
  SELECT mv.id
  FROM metric_values mv
  INNER JOIN user_metrics um ON mv.metric_id = um.id
  WHERE um.metric_name = 'Recovery Score'
    AND um.source = 'whoop'
    AND mv.id NOT IN (
      -- Выбираем ID записей с максимальным created_at для каждой даты
      SELECT DISTINCT ON (mv2.user_id, mv2.measurement_date) mv2.id
      FROM metric_values mv2
      INNER JOIN user_metrics um2 ON mv2.metric_id = um2.id
      WHERE um2.metric_name = 'Recovery Score'
        AND um2.source = 'whoop'
      ORDER BY mv2.user_id, mv2.measurement_date, mv2.created_at DESC
    )
);