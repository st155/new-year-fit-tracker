# Production Deployment Checklist

**Date**: _____________  
**Completed By**: _____________

---

## ✅ STEP 1: Login & Verify App Works (5 minutes)

- [ ] Navigate to `/auth`
- [ ] Successfully log in (Google OAuth or Email/Password)
- [ ] Redirected to Dashboard (`/`)
- [ ] Dashboard loads without errors
- [ ] Open browser console - verify no errors
- [ ] Widgets display (may show loading states)

**Status**: _________ (PASS/FAIL)  
**Notes**: _________

---

## ✅ STEP 2: Initialize Confidence Cache (8 minutes) **CRITICAL**

This is the MOST IMPORTANT step - the data quality system won't work without it!

- [ ] Navigate to `/admin` (requires trainer or admin role)
- [ ] See red alert: "Data Quality System Not Initialized"
- [ ] Click button: **"Initialize Data Quality System"**
- [ ] Wait 2-3 minutes (progress bar shows status)
- [ ] Page refreshes automatically or manually refresh
- [ ] Red alert disappears ✅
- [ ] Dashboard shows real confidence scores (not 0%)

**Verification SQL** (run in Supabase SQL Editor):
```sql
SELECT COUNT(*) as total, AVG(confidence_score) as avg_conf 
FROM metric_confidence_cache;
```

**Results**:
- Total: _______ / Target: >1000
- Average Confidence: _______ / Target: 60-80

**Status**: _________ (PASS/FAIL)  
**Time Taken**: _______ minutes

---

## ✅ STEP 3: Measure Bundle Size (5 minutes)

```bash
# Run in terminal:
npm run build
npx vite-bundle-visualizer
```

**Results** (from visualizer):
- Total Bundle (compressed): _______ KB / Target: <500KB
- Initial Load (compressed): _______ KB / Target: <200KB

**Top 3 Chunks**:
1. _______________________: _______ KB
2. _______________________: _______ KB
3. _______________________: _______ KB

**Lazy Loaded** (should be separate):
- [ ] three.js (3D components)
- [ ] recharts (charts)
- [ ] pdf.js (PDF viewer)

**Status**: _________ (PASS/FAIL)

---

## ✅ STEP 4: Lighthouse Performance Audit (5 minutes)

**Steps**:
1. Open app in Chrome (make sure you're logged in)
2. Press F12 (DevTools)
3. Navigate to "Lighthouse" tab
4. Select: ✅ Performance, ✅ Best Practices
5. Device: Desktop
6. Click "Generate Report"

**Results**:

| Metric | Score | Target | Pass? |
|--------|-------|--------|-------|
| Performance Score | ___ /100 | >90 | ☐ |
| FCP (First Contentful Paint) | ___ ms | <1800ms | ☐ |
| LCP (Largest Contentful Paint) | ___ ms | <2500ms | ☐ |
| TBT (Total Blocking Time) | ___ ms | <300ms | ☐ |
| CLS (Cumulative Layout Shift) | ___.___ | <0.1 | ☐ |

**Status**: _________ (PASS/FAIL)  
**Screenshot saved**: ☐ Yes ☐ No

---

## ✅ STEP 5: Database Health Check (10 minutes)

Run these queries in Supabase SQL Editor:

### Query 1: Confidence Cache
```sql
SELECT COUNT(*) as records, AVG(confidence_score) as avg 
FROM metric_confidence_cache;
```
**Result**: Records: _______, Avg: _______ ☐ PASS ☐ FAIL

### Query 2: Background Jobs
```sql
SELECT status, COUNT(*) FROM background_jobs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```
**Result**:
- Pending: _______
- Processing: _______
- Completed: _______
- Failed: _______

☐ PASS (few/no failures) ☐ FAIL

### Query 3: Dead Letter Queue
```sql
SELECT COUNT(*) FROM background_jobs_dlq;
```
**Result**: _______ (should be 0 or very low)  
☐ PASS ☐ FAIL

### Query 4: RLS Coverage
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false 
AND tablename NOT LIKE 'pg_%'
AND tablename NOT IN ('metric_mappings', 'device_metric_mappings');
```
**Result**: _______ tables without RLS (should be 0 or only system tables)  
☐ PASS ☐ FAIL

---

## ✅ STEP 6: Edge Functions Health (5 minutes)

```bash
curl https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/health-check
```

**Response**:
```json
{
  "status": "_________",
  "checks": {
    "database": "_________",
    "avgConfidence": _______,
    "cacheHitRate": _______,
    "failedJobs": _______
  }
}
```

**Verification**:
- [ ] status: "healthy"
- [ ] avgConfidence: >60
- [ ] cacheHitRate: >0.9
- [ ] failedJobs: 0 or very low

**Status**: _________ (PASS/FAIL)

---

## ✅ STEP 7: Frontend Functionality (10 minutes)

**Dashboard (`/`)**:
- [ ] Metrics load within 3 seconds
- [ ] Data quality badges display
- [ ] Confidence scores show (not all 0%)
- [ ] No console errors
- [ ] Charts render correctly
- [ ] Navigation works

**Admin Page (`/admin`)**:
- [ ] Page loads successfully
- [ ] Cache Hit Rate > 0%
- [ ] Average Confidence > 0
- [ ] No critical alerts (red banners)
- [ ] Manual controls work (retry jobs button, etc.)
- [ ] Monitoring stats display

**Other Critical Pages**:
- [ ] `/metrics` loads
- [ ] `/challenges` loads
- [ ] Profile pages load
- [ ] Settings page works

**Status**: _________ (PASS/FAIL)

---

## 📊 FINAL SCORING

| Category | Score | Status |
|----------|-------|--------|
| App Functionality | __/10 | ☐ |
| Confidence Cache | __/10 | ☐ |
| Bundle Size | __/10 | ☐ |
| Performance (Lighthouse) | __/10 | ☐ |
| Database Health | __/10 | ☐ |
| Edge Functions | __/10 | ☐ |
| Frontend | __/10 | ☐ |

**TOTAL**: _______ / 70

---

## 🎯 PRODUCTION READINESS

- [ ] **70/70**: Production Ready - Deploy Immediately ✅
- [ ] **60-69/70**: Production Ready with Minor Issues - Deploy with monitoring
- [ ] **50-59/70**: MVP Ready - Deploy with known limitations
- [ ] **<50/70**: Not Ready - Address critical issues first

**Final Status**: ☐ READY ☐ NOT READY

---

## 🚨 CRITICAL BLOCKERS (if any)

List any issues that MUST be fixed before deployment:

1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

---

## 📝 DEPLOYMENT DECISION

**Approved By**: _____________  
**Date**: _____________  
**Time**: _____________

**Decision**: 
- ☐ **DEPLOY TO PRODUCTION**
- ☐ **DELAY - Fix issues listed above**

**Notes**:
_________________________________________________
_________________________________________________
_________________________________________________

---

## 📚 POST-DEPLOYMENT

After deploying to production:

- [ ] Monitor logs for first 1 hour
- [ ] Check error rates in dashboard
- [ ] Verify user signups work
- [ ] Test critical user flows
- [ ] Enable monitoring alerts
- [ ] Document any issues found

**Post-Launch Status**: _____________  
**Issues Found**: _____________
