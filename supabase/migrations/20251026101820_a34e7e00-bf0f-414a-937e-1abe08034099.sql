-- ==========================================
-- CRITICAL SECURITY FIX: Protect data_freshness_tracking
-- ==========================================

-- Enable RLS
ALTER TABLE public.data_freshness_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Service role can manage freshness data" ON public.data_freshness_tracking;
DROP POLICY IF EXISTS "System can manage data freshness" ON public.data_freshness_tracking;
DROP POLICY IF EXISTS "Users can view their own data freshness" ON public.data_freshness_tracking;
DROP POLICY IF EXISTS "Users can view their own freshness data" ON public.data_freshness_tracking;

-- Policy: Users can view their own tracking data
CREATE POLICY "Users can view own data_freshness_tracking"
ON public.data_freshness_tracking
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Trainers can view their clients' tracking
CREATE POLICY "Trainers can view clients data_freshness_tracking"
ON public.data_freshness_tracking
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
    AND tc.client_id = data_freshness_tracking.user_id
    AND tc.active = true
  )
);

-- Policy: Users can insert/update their own tracking
CREATE POLICY "Users can manage own data_freshness_tracking"
ON public.data_freshness_tracking
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- CRITICAL SECURITY FIX: Protect terra_backfill_jobs
-- ==========================================

-- Enable RLS
ALTER TABLE public.terra_backfill_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own backfill jobs
CREATE POLICY "Users can view own terra_backfill_jobs"
ON public.terra_backfill_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can create their own backfill jobs
CREATE POLICY "Users can create own terra_backfill_jobs"
ON public.terra_backfill_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own backfill jobs
CREATE POLICY "Users can update own terra_backfill_jobs"
ON public.terra_backfill_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);