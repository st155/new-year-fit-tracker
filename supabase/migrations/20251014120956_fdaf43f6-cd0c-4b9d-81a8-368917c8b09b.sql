-- Remove duplicate body composition records, keeping the most recent one for each user+date
-- This is needed before we can add the unique constraint

WITH ranked_records AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, measurement_date 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM public.body_composition
)
DELETE FROM public.body_composition
WHERE id IN (
  SELECT id FROM ranked_records WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.body_composition
ADD CONSTRAINT body_composition_user_date_unique UNIQUE (user_id, measurement_date);