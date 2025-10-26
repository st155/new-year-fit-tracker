# Troubleshooting Guide

## Quick Diagnostics

### 1. Check System Health
```bash
curl https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/health-check
```

### 2. Admin Dashboard
Navigate to: `https://your-app.com/admin`

Monitor:
- Job queue status
- Confidence score averages
- Webhook success rate
- System health indicator

---

## Common Issues

### No Confidence Badges Showing

**Symptoms**:
- Metrics display without quality indicators
- Empty `metric_confidence_cache` table

**Diagnosis**:
```sql
-- Check if cache is empty
SELECT COUNT(*) FROM metric_confidence_cache;

-- Check pending jobs
SELECT COUNT(*) FROM background_jobs WHERE type = 'confidence_calculation' AND status = 'pending';
```

**Solution**:
1. Navigate to Admin Dashboard (`/admin`)
2. Click **"Recalculate All"** button
3. Wait 2-3 minutes for background jobs to process
4. Verify in cache:
   ```sql
   SELECT COUNT(*) FROM metric_confidence_cache;
   ```
5. Refresh the app

**Prevention**:
- Confidence calculation trigger should auto-create jobs
- If not triggering, check: `SELECT * FROM metric_values ORDER BY created_at DESC LIMIT 5;`

---

### Job Worker Not Processing Jobs

**Symptoms**:
- Jobs stuck in `pending` status
- `background_jobs` table filling up
- Dashboard shows high pending count

**Diagnosis**:
```sql
-- Check stuck jobs
SELECT id, type, status, attempts, created_at, started_at 
FROM background_jobs 
WHERE status = 'pending' 
ORDER BY created_at ASC 
LIMIT 10;

-- Check pg_cron status
SELECT * FROM cron.job WHERE jobname = 'invoke-job-worker';
```

**Solution**:

1. **Manual Trigger**:
   ```bash
   curl -X POST https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/job-worker \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

2. **Check Edge Function Logs**:
   - Go to Supabase Dashboard > Edge Functions > job-worker > Logs
   - Look for errors or timeouts

3. **Verify pg_cron**:
   ```sql
   -- Check if cron is running
   SELECT cron.schedule(
     'invoke-job-worker',
     '* * * * *',
     $$
     SELECT net.http_post(
       url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/job-worker',
       headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
     ) AS request_id;
     $$
   );
   ```

4. **Reset Stuck Jobs**:
   ```sql
   -- Reset jobs that started but didn't complete
   UPDATE background_jobs
   SET status = 'pending', started_at = NULL
   WHERE status = 'processing' 
     AND started_at < NOW() - INTERVAL '10 minutes';
   ```

---

### High Failed Job Count

**Symptoms**:
- Many jobs in `failed` status
- Items appearing in `background_jobs_dlq`
- Dashboard shows failed jobs badge

**Diagnosis**:
```sql
-- Check failed jobs
SELECT type, error, COUNT(*) as count
FROM background_jobs
WHERE status = 'failed'
GROUP BY type, error
ORDER BY count DESC;

-- Check DLQ
SELECT * FROM background_jobs_dlq 
WHERE retried = false
ORDER BY failed_at DESC
LIMIT 10;
```

**Common Causes & Solutions**:

#### A. Terra API Errors
**Error**: `"Terra API returned 401"`

**Solution**:
```sql
-- Verify Terra credentials are set
SELECT key FROM vault.secrets WHERE name IN ('TERRA_API_KEY', 'TERRA_DEV_ID');

-- Retry failed Terra jobs
UPDATE background_jobs
SET status = 'pending', attempts = 0, error = NULL
WHERE type = 'webhook_processing' AND status = 'failed';
```

#### B. Missing Metric Definitions
**Error**: `"Metric not found: metric_name"`

**Solution**:
```sql
-- Check user_metrics table
SELECT * FROM user_metrics WHERE metric_name = 'problematic_metric';

-- Manually create if missing
INSERT INTO user_metrics (user_id, metric_name, metric_category, unit, source)
VALUES ('user-id', 'Weight', 'body', 'kg', 'whoop');
```

#### C. Data Validation Errors
**Error**: `"Invalid value for metric"`

**Solution**:
- Check webhook payload in `terra_webhooks_raw`
- Verify data types match schema
- Add validation in job-worker if needed

#### D. Retry Failed Jobs
```sql
-- Retry specific job type
SELECT retry_failed_jobs('confidence_calculation');

-- Or via UI: Admin Dashboard > "Retry Failed Jobs"
```

---

### Webhooks Not Processing

**Symptoms**:
- Terra webhooks arriving but not creating metrics
- `terra_webhooks_raw` has data but `metric_values` is empty

**Diagnosis**:
```sql
-- Check recent webhooks
SELECT id, type, status, error, created_at
FROM terra_webhooks_raw
ORDER BY created_at DESC
LIMIT 10;

-- Check if jobs created
SELECT bj.* 
FROM background_jobs bj
JOIN terra_webhooks_raw twr ON (bj.payload->>'webhookId')::uuid = twr.id
WHERE twr.created_at > NOW() - INTERVAL '1 hour';
```

**Solution**:

1. **Verify Webhook Signature**:
   ```sql
   -- Check TERRA_SIGNING_SECRET is set
   SELECT key FROM vault.secrets WHERE name = 'TERRA_SIGNING_SECRET';
   ```

2. **Check webhook-terra Logs**:
   - Supabase Dashboard > Edge Functions > webhook-terra > Logs
   - Look for signature verification failures

3. **Manual Reprocessing**:
   ```sql
   -- Re-enqueue failed webhook
   INSERT INTO background_jobs (type, payload, status)
   SELECT 
     'webhook_processing',
     jsonb_build_object('webhookId', id, 'payload', payload),
     'pending'
   FROM terra_webhooks_raw
   WHERE status = 'failed' AND id = 'webhook-id-here';
   ```

---

### Slow Dashboard Loading

**Symptoms**:
- Admin dashboard takes > 5 seconds to load
- Monitoring API calls timing out

**Diagnosis**:
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM get_monitoring_dashboard_data();

-- Check table sizes
SELECT 
  schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solution**:

1. **Refresh Materialized View**:
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY latest_unified_metrics;
   ```

2. **Verify Indexes**:
   ```sql
   -- Check if indexes exist
   SELECT indexname, tablename FROM pg_indexes 
   WHERE tablename IN (
     'background_jobs', 
     'metric_confidence_cache',
     'terra_webhooks_raw'
   );
   ```

3. **Clean Up Old Data**:
   ```sql
   -- Delete old completed jobs (older than 7 days)
   DELETE FROM background_jobs
   WHERE status = 'completed' 
     AND completed_at < NOW() - INTERVAL '7 days';
   
   -- Delete old webhooks
   DELETE FROM terra_webhooks_raw
   WHERE status = 'completed'
     AND created_at < NOW() - INTERVAL '7 days';
   ```

---

### Rate Limit Exceeded

**Symptoms**:
- API returns `429 Too Many Requests`
- `Retry-After` header in response

**Diagnosis**:
```sql
-- Check rate limit entries
SELECT * FROM rate_limits
WHERE key LIKE '%user-id%'
ORDER BY window_start DESC;
```

**Solution**:

1. **Wait for Window Reset**: Check `Retry-After` header
2. **Implement Backoff**: Use exponential backoff in client
3. **Increase Limits** (if justified):
   ```sql
   -- Adjust in rate-limiter.ts configs
   -- Or override in specific edge function
   ```

---

### Missing Confidence Scores for Specific Metric

**Symptoms**:
- Some metrics show badges, others don't
- Inconsistent quality indicators

**Diagnosis**:
```sql
-- Check specific metric
SELECT * FROM metric_confidence_cache
WHERE user_id = 'user-id' AND metric_name = 'Weight';

-- Check if metric values exist
SELECT * FROM client_unified_metrics
WHERE user_id = 'user-id' AND metric_name = 'Weight'
ORDER BY measurement_date DESC
LIMIT 5;
```

**Solution**:

1. **Manual Calculation**:
   ```sql
   -- Enqueue specific metric
   INSERT INTO background_jobs (type, payload, status)
   VALUES (
     'confidence_calculation',
     jsonb_build_object(
       'user_id', 'user-id',
       'metric_name', 'Weight',
       'measurement_date', CURRENT_DATE::text
     ),
     'pending'
   );
   ```

2. **Verify Data Sources**:
   ```sql
   -- Check if multiple sources exist for conflict resolution
   SELECT source, COUNT(*) 
   FROM client_unified_metrics
   WHERE user_id = 'user-id' AND metric_name = 'Weight'
   GROUP BY source;
   ```

---

## Emergency Procedures

### Complete System Reset

**WARNING**: This will delete all background jobs and cache. Use only if system is unrecoverable.

```sql
BEGIN;

-- Clear all jobs
TRUNCATE background_jobs, background_jobs_dlq CASCADE;

-- Clear confidence cache
TRUNCATE metric_confidence_cache;

-- Re-enqueue calculations
SELECT enqueue_initial_confidence_calculations();

COMMIT;

-- Then trigger job worker
-- curl -X POST .../job-worker
```

### Database Maintenance

Run weekly:
```sql
-- Vacuum tables
VACUUM ANALYZE background_jobs;
VACUUM ANALYZE metric_confidence_cache;
VACUUM ANALYZE terra_webhooks_raw;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY latest_unified_metrics;

-- Clean up rate limits
SELECT cleanup_rate_limits();

-- Delete old logs
DELETE FROM edge_function_logs 
WHERE timestamp < NOW() - INTERVAL '30 days';
```

---

## Monitoring Recommendations

### Daily Checks
- [ ] Health endpoint returns `200 OK`
- [ ] No failed jobs > 1 hour old
- [ ] Webhook success rate > 95%
- [ ] Average confidence > 70%

### Weekly Checks
- [ ] Run database maintenance
- [ ] Review DLQ for patterns
- [ ] Check dashboard performance
- [ ] Verify materialized view is fresh

### Monthly Checks
- [ ] Analyze job processing trends
- [ ] Review rate limit violations
- [ ] Audit RLS policies
- [ ] Update documentation

---

## Contact & Escalation

### Self-Service Resources
1. Admin Dashboard: `/admin`
2. Health Check: `/functions/v1/health-check`
3. Supabase Dashboard: https://supabase.com/dashboard

### Logs Location
- **Edge Functions**: Supabase Dashboard > Edge Functions > [function-name] > Logs
- **Database Logs**: `SELECT * FROM edge_function_logs ORDER BY timestamp DESC LIMIT 100;`
- **Job History**: `SELECT * FROM job_processing_stats ORDER BY date DESC;`

### Debug Mode
```typescript
// Enable in edge function
const DEBUG = Deno.env.get('DEBUG') === 'true';
if (DEBUG) console.log('Debug info:', data);
```

---

## Appendix: Useful SQL Queries

```sql
-- System overview
SELECT 
  (SELECT COUNT(*) FROM background_jobs WHERE status = 'pending') as pending_jobs,
  (SELECT COUNT(*) FROM background_jobs WHERE status = 'failed') as failed_jobs,
  (SELECT COUNT(*) FROM metric_confidence_cache) as cached_metrics,
  (SELECT AVG(confidence_score) FROM metric_confidence_cache) as avg_confidence,
  (SELECT COUNT(*) FROM terra_webhooks_raw WHERE created_at > NOW() - INTERVAL '24 hours') as webhooks_24h;

-- Top error messages
SELECT error, COUNT(*) as count
FROM background_jobs
WHERE status = 'failed'
GROUP BY error
ORDER BY count DESC
LIMIT 10;

-- Slowest jobs
SELECT type, AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds
FROM background_jobs
WHERE status = 'completed' AND started_at IS NOT NULL
GROUP BY type
ORDER BY avg_seconds DESC;

-- User with most metrics
SELECT user_id, COUNT(*) as metric_count
FROM metric_confidence_cache
GROUP BY user_id
ORDER BY metric_count DESC
LIMIT 10;
```
