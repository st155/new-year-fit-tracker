-- Add unique constraint to support upserts from whoop-integration edge function
-- This fixes "there is no unique or exclusion constraint matching the ON CONFLICT specification"
ALTER TABLE public.metric_values
ADD CONSTRAINT metric_values_unique_metric_day_ext UNIQUE (metric_id, measurement_date, external_id);