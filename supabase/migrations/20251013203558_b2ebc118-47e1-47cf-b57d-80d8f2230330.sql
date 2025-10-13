-- Включаем расширения для cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Создаем cron job для автоматической синхронизации Whoop каждые 6 часов
SELECT cron.schedule(
  'whoop-auto-sync',
  '0 */6 * * *', -- Каждые 6 часов
  $$
  SELECT
    net.http_post(
        url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94"}'::jsonb,
        body:='{"action": "sync-all-users"}'::jsonb
    ) as request_id;
  $$
);

-- Создаем функцию для синхронизации всех пользователей Whoop
CREATE OR REPLACE FUNCTION sync_all_whoop_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Проходим по всем активным токенам Whoop
  FOR token_record IN 
    SELECT DISTINCT user_id 
    FROM whoop_tokens 
    WHERE is_active = true 
    AND expires_at > NOW()
  LOOP
    -- Вызываем edge function для каждого пользователя
    PERFORM net.http_post(
      url := 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
      ),
      body := jsonb_build_object(
        'action', 'sync',
        'user_id', token_record.user_id
      )
    );
  END LOOP;
END;
$$;