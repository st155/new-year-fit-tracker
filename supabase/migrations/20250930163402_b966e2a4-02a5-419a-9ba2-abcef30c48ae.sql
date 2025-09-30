-- First, delete duplicate activity feed entries, keeping only the oldest one for each source_id
DELETE FROM activity_feed a
WHERE a.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY source_id, user_id ORDER BY created_at ASC) as rn
    FROM activity_feed
    WHERE source_id IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Add a unique constraint to prevent future duplicates
-- This ensures that for each source_id, there can only be one activity feed entry
ALTER TABLE activity_feed 
ADD CONSTRAINT activity_feed_source_unique 
UNIQUE (source_id, source_table);