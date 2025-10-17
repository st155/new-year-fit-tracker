-- Включаем расширения pg_cron и pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Удаляем старую задачу, если существует
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count FROM cron.job WHERE jobname = 'sync-terra-all-users';
  
  IF job_count > 0 THEN
    PERFORM cron.unschedule('sync-terra-all-users');
  END IF;
END $$;

-- Создаем cron job для синхронизации Terra каждые 2 часа
SELECT cron.schedule(
  'sync-terra-all-users',
  '0 */2 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/terra-sync-scheduler',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $cmd$
);