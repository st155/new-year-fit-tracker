-- Create table for storing personalized metric baselines
CREATE TABLE public.user_metric_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  
  -- Personalized zones (auto-calculated)
  personal_best NUMERIC,       -- Best value (super green zone)
  personal_average NUMERIC,    -- Average value
  personal_low NUMERIC,        -- 25th percentile (lower bound of normal)
  personal_high NUMERIC,       -- 75th percentile (upper bound of normal)
  
  -- Metadata
  days_of_data INTEGER DEFAULT 0,       -- Number of days with data
  calculation_date DATE,                 -- Date of last calculation
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, metric_name)
);

-- Enable RLS
ALTER TABLE public.user_metric_baselines ENABLE ROW LEVEL SECURITY;

-- Users can view their own baselines
CREATE POLICY "Users can view their own baselines"
ON public.user_metric_baselines
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own baselines
CREATE POLICY "Users can insert their own baselines"
ON public.user_metric_baselines
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own baselines
CREATE POLICY "Users can update their own baselines"
ON public.user_metric_baselines
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own baselines
CREATE POLICY "Users can delete their own baselines"
ON public.user_metric_baselines
FOR DELETE
USING (auth.uid() = user_id);

-- Trainers can view client baselines
CREATE POLICY "Trainers can view client baselines"
ON public.user_metric_baselines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
    AND tc.client_id = user_metric_baselines.user_id
    AND tc.active = true
  )
);

-- Create index for faster lookups
CREATE INDEX idx_user_metric_baselines_user_metric 
ON public.user_metric_baselines(user_id, metric_name);

-- Create trigger for updated_at
CREATE TRIGGER update_user_metric_baselines_updated_at
BEFORE UPDATE ON public.user_metric_baselines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();