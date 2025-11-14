-- Fix Whoop terra_user_id and retry stuck webhooks
-- Step 1: Update terra_user_id to match the new connection
UPDATE terra_tokens
SET 
  terra_user_id = 'f2b9fbad-2c92-4c68-a43f-8cfb03ff6710',
  updated_at = now()
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818'
  AND provider = 'WHOOP';

-- Step 2: Mark stuck webhooks as pending for reprocessing
UPDATE webhook_logs
SET status = 'pending'
WHERE terra_user_id = 'f2b9fbad-2c92-4c68-a43f-8cfb03ff6710'
  AND status = 'received'
  AND created_at >= '2025-11-14 21:00:00';