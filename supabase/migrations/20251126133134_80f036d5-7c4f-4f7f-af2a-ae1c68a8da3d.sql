-- Delete incorrect Apple data from unified_metrics for Sergey
DELETE FROM unified_metrics
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818'
  AND LOWER(source) = 'apple';

-- Remove Apple token completely from terra_tokens
DELETE FROM terra_tokens
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818'
  AND provider = 'APPLE';