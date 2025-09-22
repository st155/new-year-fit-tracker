-- Fix Withings sync upsert: add unique index matching ON CONFLICT target
-- This enables: ON CONFLICT (user_id, metric_id, measurement_date, external_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_metric_values_user_metric_date_external
ON public.metric_values (user_id, metric_id, measurement_date, external_id);