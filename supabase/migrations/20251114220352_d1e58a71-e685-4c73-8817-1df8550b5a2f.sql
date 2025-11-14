-- Create background jobs for pending Whoop webhooks
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
WHERE terra_user_id = 'f2b9fbad-2c92-4c68-a43f-8cfb03ff6710'
  AND status = 'pending'
  AND created_at >= '2025-11-14 21:00:00'
  AND id::text NOT IN (
    SELECT payload->>'webhookId'
    FROM background_jobs 
    WHERE type = 'webhook_processing'
  );