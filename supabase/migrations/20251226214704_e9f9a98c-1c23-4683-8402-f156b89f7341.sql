-- Remove remaining outdated WHOOP cron jobs (calling non-existent functions)
SELECT cron.unschedule(1); -- whoop-token-refresh-hourly (function doesn't exist)
SELECT cron.unschedule(9); -- whoop-token-refresh-and-sync (function doesn't exist)