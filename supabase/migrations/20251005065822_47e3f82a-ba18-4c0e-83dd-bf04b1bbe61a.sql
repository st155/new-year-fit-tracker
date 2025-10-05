-- Re-run unique index creation, excluding the conflicting key and using a safer composite key
CREATE UNIQUE INDEX IF NOT EXISTS ux_activity_feed_source ON public.activity_feed (source_id, source_table);
CREATE UNIQUE INDEX IF NOT EXISTS ux_workouts_user_external ON public.workouts (user_id, external_id);

-- Metric values unique indexes to support various upsert patterns
CREATE UNIQUE INDEX IF NOT EXISTS ux_metric_values_metric_date_external ON public.metric_values (metric_id, measurement_date, external_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_metric_values_user_metric_external ON public.metric_values (user_id, metric_id, external_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_metric_values_user_metric_date_external ON public.metric_values (user_id, metric_id, measurement_date, external_id);

-- Whoop mapping uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS ux_whoop_user_mapping_user ON public.whoop_user_mapping (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_whoop_user_mapping_whoop_user ON public.whoop_user_mapping (whoop_user_id);
