-- Reprocess sleep and daily webhooks to capture detailed sleep phases
-- This migration marks recent sleep/daily webhooks as pending so they can be reprocessed
-- with the new job-worker logic that correctly calculates sleep phases

UPDATE terra_webhooks_raw
SET 
  status = 'pending',
  processed_at = NULL,
  processed_count = 0
WHERE type IN ('sleep', 'daily')
  AND created_at >= NOW() - INTERVAL '7 days'
  AND status = 'completed';