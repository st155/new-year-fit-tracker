-- Schedule hourly sync to fetch fresh Whoop (and other) data shortly after token refresh
-- Token refresh is at minute 5 each hour (existing job). We run scheduled-sync at minute 10.
select
  cron.schedule(
    'scheduled-sync-hourly',
    '10 * * * *',
    $$
    select
      net.http_post(
          url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/scheduled-sync',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94"}'::jsonb,
          body:='{"source":"cron","reason":"hourly"}'::jsonb
      ) as request_id;
    $$
  );