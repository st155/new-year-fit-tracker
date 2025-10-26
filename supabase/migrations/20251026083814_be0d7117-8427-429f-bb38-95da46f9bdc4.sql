-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job-worker to run every minute
SELECT cron.schedule(
  'job-worker-every-minute',
  '* * * * *', -- Run every minute
  $$
  SELECT net.http_post(
    url := 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/job-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Create index on background_jobs for faster dequeue operations
CREATE INDEX IF NOT EXISTS idx_background_jobs_status_scheduled 
ON public.background_jobs (status, scheduled_at) 
WHERE status = 'pending';

-- Create index on terra_webhooks_raw for faster lookups
CREATE INDEX IF NOT EXISTS idx_terra_webhooks_raw_status 
ON public.terra_webhooks_raw (status, created_at);

CREATE INDEX IF NOT EXISTS idx_terra_webhooks_raw_webhook_id 
ON public.terra_webhooks_raw (webhook_id);