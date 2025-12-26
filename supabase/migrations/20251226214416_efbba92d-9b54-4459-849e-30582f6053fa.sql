-- Remove outdated WHOOP cron jobs (calling non-existent whoop-integration function)
SELECT cron.unschedule(3); -- whoop-auto-sync
SELECT cron.unschedule(5); -- whoop-hourly-sync

-- Create new cron job for whoop-scheduled-sync every 15 minutes
SELECT
  cron.schedule(
    'whoop-scheduled-sync-15min',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
      url := 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-scheduled-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) as request_id;
    $$
  );