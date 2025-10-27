-- Phase 1: Create unified_metrics table (single source of truth)

CREATE TABLE public.unified_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  
  -- Data source
  source TEXT NOT NULL,
  provider TEXT,
  external_id TEXT,
  
  -- Data quality
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  confidence_factors JSONB,
  is_outlier BOOLEAN DEFAULT false,
  
  -- Source priority (lower = better)
  priority INTEGER NOT NULL DEFAULT 10,
  
  -- Metadata
  source_data JSONB,
  notes TEXT,
  photo_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, metric_name, measurement_date, source)
);

-- Performance indexes
CREATE INDEX idx_unified_metrics_user ON unified_metrics(user_id);
CREATE INDEX idx_unified_metrics_user_metric ON unified_metrics(user_id, metric_name);
CREATE INDEX idx_unified_metrics_user_date ON unified_metrics(user_id, measurement_date DESC);
CREATE INDEX idx_unified_metrics_confidence ON unified_metrics(confidence_score DESC);
CREATE INDEX idx_unified_metrics_priority ON unified_metrics(priority ASC);

-- Composite index for fast latest queries
CREATE INDEX idx_unified_metrics_latest ON unified_metrics(
  user_id, 
  metric_name, 
  measurement_date DESC, 
  priority ASC, 
  confidence_score DESC
);

-- RLS policies
ALTER TABLE unified_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own metrics
CREATE POLICY "Users can view own metrics"
  ON unified_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own metrics
CREATE POLICY "Users can insert own metrics"
  ON unified_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own metrics
CREATE POLICY "Users can update own metrics"
  ON unified_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own metrics
CREATE POLICY "Users can delete own metrics"
  ON unified_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- Trainers can view their clients' metrics
CREATE POLICY "Trainers can view client metrics"
  ON unified_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = unified_metrics.user_id
        AND tc.active = true
    )
  );

-- System can manage all metrics (for job-worker)
CREATE POLICY "System can manage metrics"
  ON unified_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON unified_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();