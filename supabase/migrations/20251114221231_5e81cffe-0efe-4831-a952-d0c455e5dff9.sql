-- Mass fix for lost integrations: Create missing tokens and recover webhook data

-- Step 1: Create/update terra_tokens for all affected integrations
-- Kristina - new WHOOP
INSERT INTO terra_tokens (user_id, provider, terra_user_id, is_active, created_at, updated_at)
VALUES (
  '4e608801-d141-49a4-b254-853bee42069b',
  'WHOOP',
  '60453ea9-8758-497a-8e72-d4d08afa4ebb',
  true,
  '2025-11-10 18:06:34'::timestamp,
  now()
)
ON CONFLICT (user_id, provider) 
DO UPDATE SET 
  terra_user_id = EXCLUDED.terra_user_id,
  is_active = true,
  updated_at = now();

-- Your Google integration
INSERT INTO terra_tokens (user_id, provider, terra_user_id, is_active, created_at, updated_at)
VALUES (
  'a527db40-3f7f-448f-8782-da632711e818',
  'GOOGLE',
  '9ee8f40f-2f08-4810-87d6-b340053c7c32',
  true,
  '2025-11-09 17:37:36'::timestamp,
  now()
)
ON CONFLICT (user_id, provider) 
DO UPDATE SET 
  terra_user_id = EXCLUDED.terra_user_id,
  is_active = true,
  updated_at = now();

-- Your Apple Watch / HealthKit integration
INSERT INTO terra_tokens (user_id, provider, terra_user_id, is_active, created_at, updated_at)
VALUES (
  'a527db40-3f7f-448f-8782-da632711e818',
  'APPLE',
  '6c65dab6-c772-45e1-b4e8-a5013d289fcb',
  true,
  '2025-11-10 18:36:13'::timestamp,
  now()
)
ON CONFLICT (user_id, provider) 
DO UPDATE SET 
  terra_user_id = EXCLUDED.terra_user_id,
  is_active = true,
  updated_at = now();

-- Step 2: Mark all stuck webhooks as pending (excluding old Whoop token)
UPDATE webhook_logs
SET status = 'pending'
WHERE terra_user_id IN (
  '60453ea9-8758-497a-8e72-d4d08afa4ebb',  -- Kristina Whoop
  '9ee8f40f-2f08-4810-87d6-b340053c7c32',  -- Your Google
  '6c65dab6-c772-45e1-b4e8-a5013d289fcb'   -- Your Apple
)
AND status = 'received'
AND payload->>'type' IN ('body', 'daily', 'sleep', 'activity');

-- Step 3: Create background_jobs for reprocessing
INSERT INTO background_jobs (type, payload, status, scheduled_at)
SELECT 
  'webhook_processing',
  jsonb_build_object(
    'webhookId', id::text,
    'payload', payload
  ),
  'pending',
  now()
FROM webhook_logs
WHERE terra_user_id IN (
  '60453ea9-8758-497a-8e72-d4d08afa4ebb',
  '9ee8f40f-2f08-4810-87d6-b340053c7c32',
  '6c65dab6-c772-45e1-b4e8-a5013d289fcb'
)
AND status = 'pending'
AND id::text NOT IN (
  SELECT payload->>'webhookId'
  FROM background_jobs 
  WHERE type = 'webhook_processing'
);