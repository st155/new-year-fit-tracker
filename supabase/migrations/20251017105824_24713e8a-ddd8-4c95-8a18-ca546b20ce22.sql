-- Добавляем уникальные индексы для корректной работы upsert в Terra интеграции

-- 1. Уникальный индекс для metric_values (критично для upsert метрик)
CREATE UNIQUE INDEX IF NOT EXISTS uq_metric_values_user_metric_date_external 
ON public.metric_values(user_id, metric_id, measurement_date, COALESCE(external_id, ''));

-- 2. Уникальный индекс на workouts.external_id (для upsert тренировок)
CREATE UNIQUE INDEX IF NOT EXISTS uq_workouts_external_id 
ON public.workouts(external_id) 
WHERE external_id IS NOT NULL;