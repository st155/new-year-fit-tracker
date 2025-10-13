-- Создаем cron job для автоматической синхронизации Terra каждые 6 часов
SELECT cron.schedule(
  'terra-auto-sync',
  '0 */6 * * *', -- Каждые 6 часов
  $$
  SELECT
    net.http_post(
        url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/terra-integration',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94", "x-service-role": "true"}'::jsonb,
        body:='{"action": "sync-all-users"}'::jsonb
    ) as request_id;
  $$
);