-- ========================================
-- Setup Cron Job for Stuck Webhook Retry
-- ========================================

-- Note: This requires pg_cron and pg_net extensions to be enabled in Supabase dashboard

-- Schedule cron job to retry stuck webhooks every 15 minutes
SELECT cron.schedule(
  'retry-stuck-webhooks-every-15min',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://d.elite10.club/functions/v1/retry-stuck-webhooks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
