-- Удаляем существующие задачи синхронизации
SELECT cron.unschedule('health-data-sync');
SELECT cron.unschedule('health-data-sync-frequent');

-- Создаем новую задачу синхронизации каждые 3 часа
SELECT cron.schedule(
  'health-data-sync-3hours',
  '0 */3 * * *', -- каждые 3 часа
  $$
  SELECT
    net.http_post(
        url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/scheduled-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ1MDA2MSwiZXhwIjoyMDc0MDI2MDYxfQ.R1D7W3Mts0VVuGDNBQEMYvXHe5S6B5_HSqtEE-qhKe8"}'::jsonb,
        body:='{"scheduled": true, "frequent": true}'::jsonb
    ) as request_id;
  $$
);