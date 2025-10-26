-- Phase 4: Data Quality & Confidence Cache
-- Create table for caching confidence scores

CREATE TABLE IF NOT EXISTS public.metric_confidence_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  source TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source_reliability INTEGER NOT NULL CHECK (source_reliability >= 0 AND source_reliability <= 40),
  data_freshness INTEGER NOT NULL CHECK (data_freshness >= 0 AND data_freshness <= 20),
  measurement_frequency INTEGER NOT NULL CHECK (measurement_frequency >= 0 AND measurement_frequency <= 20),
  cross_validation INTEGER NOT NULL CHECK (cross_validation >= 0 AND cross_validation <= 20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metric_name, source, measurement_date)
);

-- Indexes for performance
CREATE INDEX idx_confidence_cache_user_metric ON public.metric_confidence_cache(user_id, metric_name);
CREATE INDEX idx_confidence_cache_user_date ON public.metric_confidence_cache(user_id, measurement_date DESC);
CREATE INDEX idx_confidence_cache_confidence ON public.metric_confidence_cache(confidence_score DESC);

-- Enable RLS
ALTER TABLE public.metric_confidence_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own confidence cache"
  ON public.metric_confidence_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view their clients' confidence cache"
  ON public.metric_confidence_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = metric_confidence_cache.user_id
        AND tc.active = true
    )
  );

CREATE POLICY "System can manage confidence cache"
  ON public.metric_confidence_cache FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update trigger for timestamps
CREATE TRIGGER update_confidence_cache_updated_at
  BEFORE UPDATE ON public.metric_confidence_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-enqueue confidence calculation when new metrics are added
CREATE OR REPLACE FUNCTION public.enqueue_confidence_calculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Enqueue a job to calculate confidence for this metric
  INSERT INTO public.background_jobs (type, payload, status)
  VALUES (
    'confidence_calculation',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'metric_name', (SELECT metric_name FROM public.user_metrics WHERE id = NEW.metric_id),
      'measurement_date', NEW.measurement_date
    ),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_enqueue_confidence_calculation
  AFTER INSERT ON public.metric_values
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_confidence_calculation();

-- Update client_unified_metrics view to use confidence scores
DROP VIEW IF EXISTS public.client_unified_metrics CASCADE;

CREATE OR REPLACE VIEW public.client_unified_metrics AS
WITH ranked_metrics AS (
  SELECT 
    mv.user_id,
    um.metric_name,
    mv.value,
    mv.measurement_date,
    um.source,
    um.unit,
    um.metric_category,
    COALESCE(mcc.confidence_score, 50) as confidence_score,
    COALESCE(
      CASE um.source
        WHEN 'inbody' THEN 1
        WHEN 'withings' THEN 2
        WHEN 'whoop' THEN 3
        WHEN 'apple_health' THEN 4
        WHEN 'terra' THEN 5
        WHEN 'manual' THEN 6
        ELSE 10
      END,
      10
    ) as priority,
    mv.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY mv.user_id, um.metric_name, mv.measurement_date 
      ORDER BY 
        COALESCE(mcc.confidence_score, 50) DESC,
        CASE um.source
          WHEN 'inbody' THEN 1
          WHEN 'withings' THEN 2
          WHEN 'whoop' THEN 3
          WHEN 'apple_health' THEN 4
          WHEN 'terra' THEN 5
          WHEN 'manual' THEN 6
          ELSE 10
        END ASC,
        mv.created_at DESC
    ) as rank
  FROM public.metric_values mv
  JOIN public.user_metrics um ON um.id = mv.metric_id
  LEFT JOIN public.metric_confidence_cache mcc ON 
    mcc.user_id = mv.user_id 
    AND mcc.metric_name = um.metric_name
    AND mcc.source = um.source
    AND mcc.measurement_date = mv.measurement_date
)
SELECT 
  user_id,
  metric_name,
  value,
  measurement_date,
  source,
  unit,
  metric_category,
  confidence_score,
  priority,
  created_at
FROM ranked_metrics
WHERE rank = 1;