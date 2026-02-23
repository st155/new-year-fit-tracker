
-- Add cron job for scheduled-terra-sync (replaces broken terra-sync-scheduler)
SELECT cron.schedule(
  'scheduled-terra-sync-every-2h',
  '30 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/scheduled-terra-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) as request_id;
  $$
);

-- Disable broken terra-sync-scheduler cron (job ID 8: sync-terra-all-users)
SELECT cron.unschedule('sync-terra-all-users');
