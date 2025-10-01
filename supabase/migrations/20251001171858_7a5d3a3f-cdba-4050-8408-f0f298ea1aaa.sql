-- Remove duplicate workout entries from activity_feed that have external_id suffixes
-- Keep only the main workout entry (without _calories, _hr, _max_hr suffixes)
DELETE FROM public.activity_feed
WHERE source_table = 'metric_values'
  AND (action_text ILIKE '%workout%' OR action_text ILIKE '%трениров%')
  AND (
    metadata->>'external_id' LIKE '%_calories'
    OR metadata->>'external_id' LIKE '%_hr'
    OR metadata->>'external_id' LIKE '%_max_hr'
  );