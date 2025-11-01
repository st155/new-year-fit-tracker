-- Create goal_templates table for trainers
CREATE TABLE IF NOT EXISTS public.goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

-- Trainers can view their own templates and public templates
CREATE POLICY "Trainers can view their own and public templates"
ON public.goal_templates
FOR SELECT
USING (
  auth.uid() = trainer_id OR is_public = true
);

-- Trainers can create their own templates
CREATE POLICY "Trainers can create templates"
ON public.goal_templates
FOR INSERT
WITH CHECK (auth.uid() = trainer_id);

-- Trainers can update their own templates
CREATE POLICY "Trainers can update their own templates"
ON public.goal_templates
FOR UPDATE
USING (auth.uid() = trainer_id);

-- Trainers can delete their own templates
CREATE POLICY "Trainers can delete their own templates"
ON public.goal_templates
FOR DELETE
USING (auth.uid() = trainer_id);

-- Create index for faster queries
CREATE INDEX idx_goal_templates_trainer_id ON public.goal_templates(trainer_id);
CREATE INDEX idx_goal_templates_is_public ON public.goal_templates(is_public) WHERE is_public = true;

-- Create client_health_scores view
CREATE OR REPLACE VIEW public.client_health_scores AS
SELECT 
  user_id,
  
  -- Recovery component (25%)
  ROUND(COALESCE(AVG(CASE WHEN metric_name = 'Recovery Score' 
                     THEN value END), 0) / 100.0 * 25) as recovery_score,
  
  -- Sleep component (25%)
  ROUND(
    (COALESCE(AVG(CASE WHEN metric_name = 'Sleep Duration' 
                      THEN value END), 0) / 10.0 * 12.5) +
    (COALESCE(AVG(CASE WHEN metric_name = 'Sleep Efficiency' 
                      THEN value END), 0) / 100.0 * 12.5)
  ) as sleep_score,
  
  -- Activity component (20%)
  ROUND(
    (COALESCE(AVG(CASE WHEN metric_name = 'Steps' 
                      THEN value END), 0) / 15000.0 * 10) +
    (COALESCE(AVG(CASE WHEN metric_name = 'Day Strain' 
                      THEN value END), 0) / 21.0 * 10)
  ) as activity_score,
  
  -- Consistency component (15%)
  ROUND(COUNT(DISTINCT measurement_date)::float / 30.0 * 15) as consistency_score,
  
  -- Trend component (15%) - simplified placeholder
  ROUND(
    CASE 
      WHEN AVG(CASE WHEN measurement_date >= CURRENT_DATE - INTERVAL '7 days' 
                     AND metric_name = 'Recovery Score' THEN value END) >
           AVG(CASE WHEN measurement_date >= CURRENT_DATE - INTERVAL '14 days' 
                     AND measurement_date < CURRENT_DATE - INTERVAL '7 days'
                     AND metric_name = 'Recovery Score' THEN value END)
      THEN 15
      ELSE 7.5
    END
  ) as trend_score,
  
  -- Total health score
  ROUND(
    (COALESCE(AVG(CASE WHEN metric_name = 'Recovery Score' THEN value END), 0) / 100.0 * 25) +
    ((COALESCE(AVG(CASE WHEN metric_name = 'Sleep Duration' THEN value END), 0) / 10.0 * 12.5) +
     (COALESCE(AVG(CASE WHEN metric_name = 'Sleep Efficiency' THEN value END), 0) / 100.0 * 12.5)) +
    ((COALESCE(AVG(CASE WHEN metric_name = 'Steps' THEN value END), 0) / 15000.0 * 10) +
     (COALESCE(AVG(CASE WHEN metric_name = 'Day Strain' THEN value END), 0) / 21.0 * 10)) +
    (COUNT(DISTINCT measurement_date)::float / 30.0 * 15) +
    CASE 
      WHEN AVG(CASE WHEN measurement_date >= CURRENT_DATE - INTERVAL '7 days' 
                     AND metric_name = 'Recovery Score' THEN value END) >
           AVG(CASE WHEN measurement_date >= CURRENT_DATE - INTERVAL '14 days' 
                     AND measurement_date < CURRENT_DATE - INTERVAL '7 days'
                     AND metric_name = 'Recovery Score' THEN value END)
      THEN 15
      ELSE 7.5
    END
  ) as total_health_score,
  
  MAX(measurement_date) as last_measurement
FROM public.unified_metrics
WHERE measurement_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id;