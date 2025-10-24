-- 1. Таблица для отслеживания пропущенных webhooks и retry queue
CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'daily', 'sleep', 'activity', 'body'
  missing_date DATE NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider, data_type, missing_date)
);

-- 2. Таблица для мониторинга свежести данных
CREATE TABLE IF NOT EXISTS public.data_freshness_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  data_type TEXT NOT NULL,
  last_received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_received_date DATE NOT NULL,
  consecutive_missing_days INTEGER DEFAULT 0,
  alert_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider, data_type)
);

-- 3. Таблица для failed webhook processing
CREATE TABLE IF NOT EXISTS public.failed_webhook_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_log_id UUID REFERENCES public.webhook_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- 'pending', 'retrying', 'failed_permanently'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица для tracking backfill progress
CREATE TABLE IF NOT EXISTS public.terra_backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress_percentage INTEGER DEFAULT 0,
  date_being_processed DATE,
  total_days INTEGER,
  processed_days INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, provider, start_date, end_date)
);

-- 5. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_user_status 
  ON public.webhook_retry_queue(user_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_next_retry 
  ON public.webhook_retry_queue(status, last_retry_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_data_freshness_user_provider 
  ON public.data_freshness_tracking(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_data_freshness_alerts 
  ON public.data_freshness_tracking(alert_sent, consecutive_missing_days)
  WHERE alert_sent = FALSE AND consecutive_missing_days > 2;

CREATE INDEX IF NOT EXISTS idx_failed_webhook_next_retry 
  ON public.failed_webhook_processing(next_retry_at, status)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_terra_backfill_user_status 
  ON public.terra_backfill_jobs(user_id, status);

-- 6. RLS policies
ALTER TABLE public.webhook_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_freshness_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_webhook_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terra_backfill_jobs ENABLE ROW LEVEL SECURITY;

-- Policies для webhook_retry_queue
CREATE POLICY "Users can view their own retry queue"
  ON public.webhook_retry_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage retry queue"
  ON public.webhook_retry_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies для data_freshness_tracking
CREATE POLICY "Users can view their own freshness data"
  ON public.data_freshness_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage freshness data"
  ON public.data_freshness_tracking FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies для failed_webhook_processing
CREATE POLICY "Service role can manage failed webhooks"
  ON public.failed_webhook_processing FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies для terra_backfill_jobs
CREATE POLICY "Users can view their own backfill jobs"
  ON public.terra_backfill_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage backfill jobs"
  ON public.terra_backfill_jobs FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_terra_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Триггеры для updated_at
CREATE TRIGGER update_webhook_retry_queue_updated_at
  BEFORE UPDATE ON public.webhook_retry_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_terra_tables_updated_at();

CREATE TRIGGER update_data_freshness_tracking_updated_at
  BEFORE UPDATE ON public.data_freshness_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_terra_tables_updated_at();

CREATE TRIGGER update_failed_webhook_processing_updated_at
  BEFORE UPDATE ON public.failed_webhook_processing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_terra_tables_updated_at();

CREATE TRIGGER update_terra_backfill_jobs_updated_at
  BEFORE UPDATE ON public.terra_backfill_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_terra_tables_updated_at();