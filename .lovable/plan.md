
## Fix: Terra WHOOP Users Not Receiving Data

### Problem

There are **two types of WHOOP users** in the system:

1. **Direct WHOOP users** (4 users via `whoop_tokens`) -- working fine, synced every 15 min by `whoop-scheduled-sync`
2. **Terra WHOOP users** (7 users via `terra_tokens` with provider='WHOOP') -- **broken since Feb 17**, no data flowing

### Root Cause

The `terra-sync-scheduler` cron job (runs every 2 hours) **times out** because it sequentially calls `terra-integration` for each user, which is too slow. As a result, Terra WHOOP users receive no scheduled data sync.

Meanwhile, `scheduled-terra-sync` (a simpler, faster function that calls Terra API directly with `to_webhook=true`) already supports WHOOP but **has no cron job configured**.

### Fix

**Add a cron job for `scheduled-terra-sync`** to run every 2 hours, replacing the broken `terra-sync-scheduler`. This function:
- Queries `terra_tokens` for active GARMIN, ULTRAHUMAN, and WHOOP providers
- Calls Terra API directly with `to_webhook=true` for each user
- Data flows back through `webhook-terra` -> `job-worker` -> `unified_metrics`

### Technical Details

**Database migration (1 cron job):**
```sql
-- Add cron job for scheduled-terra-sync (replaces broken terra-sync-scheduler)
SELECT cron.schedule(
  'scheduled-terra-sync-every-2h',
  '30 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/scheduled-terra-sync',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) as request_id;
  $$
);

-- Disable broken terra-sync-scheduler cron
SELECT cron.unschedule(8);
```

**No code changes needed** -- `scheduled-terra-sync` already handles WHOOP correctly (line 30: `.in('provider', ['GARMIN', 'ULTRAHUMAN', 'WHOOP'])`).

### Expected Results

- Terra WHOOP users will receive data syncs every 2 hours
- Data will flow: Terra API -> `webhook-terra` -> `job-worker` -> `unified_metrics`
- Day Strain, Recovery, HRV, and other metrics will appear for Terra WHOOP users
- No impact on direct WHOOP users (separate sync path)

### Files Changed

| Change | Details |
|--------|---------|
| Database migration | Add cron for `scheduled-terra-sync`, remove broken `terra-sync-scheduler` cron |
