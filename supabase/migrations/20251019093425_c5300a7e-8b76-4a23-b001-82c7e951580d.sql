-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Создаем cron job для автоматической синхронизации Whoop каждые 6 часов
-- Это обновит токены, которые истекают в ближайшие 12 часов
SELECT cron.schedule(
  'whoop-token-refresh-and-sync',
  '0 */6 * * *', -- Каждые 6 часов (в 00:00, 06:00, 12:00, 18:00)
  $$
  SELECT
    net.http_post(
        url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/scheduled-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94"}'::jsonb,
        body:=concat('{"time": "', now(), '", "source": "cron"}')::jsonb
    ) as request_id;
  $$
);

-- Проверяем созданный cron job
SELECT * FROM cron.job WHERE jobname = 'whoop-token-refresh-and-sync';