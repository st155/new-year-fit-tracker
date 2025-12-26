-- Safe normalization: handle ALL duplicate cases before normalizing

-- Step 1: Delete uppercase duplicates where lowercase version exists (for ALL providers)
DELETE FROM unified_metrics um
WHERE um.source ~ '[A-Z]'
  AND EXISTS (
    SELECT 1 FROM unified_metrics um2
    WHERE um2.user_id = um.user_id
      AND um2.metric_name = um.metric_name
      AND um2.measurement_date = um.measurement_date
      AND um2.source = LOWER(um.source)
  );

-- Step 2: Now safely normalize all remaining uppercase sources to lowercase
UPDATE unified_metrics 
SET 
  source = LOWER(source), 
  provider = LOWER(provider),
  updated_at = now()
WHERE source ~ '[A-Z]' OR provider ~ '[A-Z]';