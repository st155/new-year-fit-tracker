-- Включаем расширения для планирования задач
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Создаем cron задачу для автоматического обновления Whoop токенов каждый час
-- Задача будет запускаться в :05 минут каждого часа
SELECT cron.schedule(
  'whoop-token-refresh-hourly',
  '5 * * * *', -- каждый час в :05 минут
  $$
  SELECT
    net.http_post(
        url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-token-refresh',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
