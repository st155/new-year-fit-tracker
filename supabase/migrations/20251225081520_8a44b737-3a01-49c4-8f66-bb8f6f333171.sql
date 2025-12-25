-- Drop the old unique constraint that doesn't account for source
DROP INDEX IF EXISTS public.idx_measurements_unique_per_day;

-- The new index measurements_goal_user_date_source_idx already exists and handles source-aware uniqueness