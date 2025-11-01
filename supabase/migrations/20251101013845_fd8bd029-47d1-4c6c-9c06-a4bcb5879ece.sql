-- ========================================
-- PRIORITY 4: Fix Webhook Processing Issues
-- ========================================

-- 1. Add missing job_id column
ALTER TABLE public.terra_webhooks_raw 
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.background_jobs(id);

CREATE INDEX IF NOT EXISTS idx_terra_webhooks_job_id ON public.terra_webhooks_raw(job_id);
CREATE INDEX IF NOT EXISTS idx_terra_webhooks_status_created ON public.terra_webhooks_raw(status, created_at);

-- 2. Add retry mechanism for stuck pending webhooks
-- Create a function to retry stuck webhooks
CREATE OR REPLACE FUNCTION public.retry_stuck_terra_webhooks(
  stuck_threshold_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
  retried_count INTEGER,
  failed_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retried_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  stuck_webhook RECORD;
BEGIN
  -- Find stuck pending webhooks
  FOR stuck_webhook IN 
    SELECT id, webhook_id, type, user_id, provider, payload
    FROM terra_webhooks_raw
    WHERE status = 'pending'
      AND created_at < NOW() - (stuck_threshold_minutes || ' minutes')::INTERVAL
      AND (processed_count IS NULL OR processed_count < 3)
    ORDER BY created_at ASC
    LIMIT 100
  LOOP
    BEGIN
      -- Create background job for stuck webhook
      INSERT INTO background_jobs (type, payload, status)
      VALUES (
        'webhook_processing',
        jsonb_build_object(
          'webhookId', stuck_webhook.webhook_id,
          'payload', stuck_webhook.payload,
          'retry', true
        ),
        'pending'
      )
      RETURNING id INTO stuck_webhook.id;

      -- Update webhook status
      UPDATE terra_webhooks_raw
      SET 
        status = 'retry',
        job_id = stuck_webhook.id,
        processed_count = COALESCE(processed_count, 0) + 1
      WHERE webhook_id = stuck_webhook.webhook_id;

      v_retried_count := v_retried_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed if retry fails
      UPDATE terra_webhooks_raw
      SET 
        status = 'failed',
        processed_count = COALESCE(processed_count, 0) + 1
      WHERE webhook_id = stuck_webhook.webhook_id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_retried_count, v_failed_count;
END;
$$;

-- 3. Retry all currently stuck webhooks (one-time fix)
DO $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM public.retry_stuck_terra_webhooks(60);
  RAISE NOTICE 'Retried % stuck webhooks, % failed', result.retried_count, result.failed_count;
END $$;

COMMENT ON FUNCTION public.retry_stuck_terra_webhooks IS 'Retries webhooks stuck in pending status for more than threshold minutes';
COMMENT ON COLUMN public.terra_webhooks_raw.job_id IS 'Link to background_jobs for processing tracking';
