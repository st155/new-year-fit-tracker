-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule data sync to run every 6 hours (4 times per day)
SELECT cron.schedule(
  'health-data-sync',
  '0 */6 * * *', -- Every 6 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/scheduled-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ1MDA2MSwiZXhwIjoyMDc0MDI2MDYxfQ.R1D7W3Mts0VVuGDNBQEMYvXHe5S6B5_HSqtEE-qhKe8"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Also schedule a more frequent sync during active hours (every 2 hours from 6 AM to 10 PM)
SELECT cron.schedule(
  'health-data-sync-frequent',
  '0 6-22/2 * * *', -- Every 2 hours between 6 AM and 10 PM
  $$
  SELECT
    net.http_post(
        url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/scheduled-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ1MDA2MSwiZXhwIjoyMDc0MDI2MDYxfQ.R1D7W3Mts0VVuGDNBQEMYvXHe5S6B5_HSqtEE-qhKe8"}'::jsonb,
        body:='{"scheduled": true, "frequent": true}'::jsonb
    ) as request_id;
  $$
);