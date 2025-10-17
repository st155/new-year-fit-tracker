-- Включаем расширения pg_cron и pg_net (если еще не включены)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Удаляем старую задачу, если существует
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-terra-all-users') THEN
    PERFORM cron.unschedule('sync-terra-all-users');
  END IF;
END $$;

-- Настраиваем cron job: каждые 2 часа
SELECT cron.schedule(
  'sync-terra-all-users',
  '0 */2 * * *', -- в 00:00, 02:00, 04:00, ..., 22:00
  $$
  SELECT net.http_post(
    url := 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/terra-sync-scheduler',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Проверяем, что задача создана
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'sync-terra-all-users';