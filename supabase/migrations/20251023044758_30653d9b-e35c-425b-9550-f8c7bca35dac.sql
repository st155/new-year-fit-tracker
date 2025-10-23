-- Create goal_baselines table for storing baseline values
CREATE TABLE IF NOT EXISTS public.goal_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  baseline_value NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT CHECK (source IN ('manual', 'inbody', 'withings', 'measurement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add baseline_goals JSONB column to challenge_participants
ALTER TABLE public.challenge_participants
ADD COLUMN IF NOT EXISTS baseline_goals JSONB DEFAULT '{}'::jsonb;

-- Enable RLS on goal_baselines
ALTER TABLE public.goal_baselines ENABLE ROW LEVEL SECURITY;

-- Users can view their own baselines
CREATE POLICY "Users can view their own goal baselines"
ON public.goal_baselines
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own baselines
CREATE POLICY "Users can insert their own goal baselines"
ON public.goal_baselines
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own baselines
CREATE POLICY "Users can update their own goal baselines"
ON public.goal_baselines
FOR UPDATE
USING (auth.uid() = user_id);

-- Trainers can view client baselines
CREATE POLICY "Trainers can view client goal baselines"
ON public.goal_baselines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
    AND tc.client_id = goal_baselines.user_id
    AND tc.active = true
  )
);

-- Create view for challenge progress calculation
CREATE OR REPLACE VIEW public.challenge_progress AS
SELECT 
  cp.user_id,
  cp.challenge_id,
  g.id as goal_id,
  g.goal_name,
  g.goal_type,
  g.target_value,
  g.target_unit,
  gb.baseline_value,
  gb.source as baseline_source,
  gb.recorded_at as baseline_recorded_at,
  -- Get latest measurement value
  (
    SELECT mv.value 
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.metric_name = g.goal_name
    AND mv.user_id = cp.user_id
    ORDER BY mv.measurement_date DESC 
    LIMIT 1
  ) as current_value,
  -- Calculate progress percentage
  CASE 
    -- For "lower is better" metrics (body fat, weight, running time)
    WHEN g.goal_type IN ('body_composition', 'cardio') AND gb.baseline_value > g.target_value
      THEN ROUND(((gb.baseline_value - COALESCE(
        (SELECT mv.value FROM metric_values mv JOIN user_metrics um ON um.id = mv.metric_id 
         WHERE um.metric_name = g.goal_name AND mv.user_id = cp.user_id 
         ORDER BY mv.measurement_date DESC LIMIT 1), 
        gb.baseline_value)) / NULLIF(gb.baseline_value - g.target_value, 0)) * 100, 2)
    -- For "higher is better" metrics (reps, weight lifted, duration)
    ELSE 
      ROUND(((COALESCE(
        (SELECT mv.value FROM metric_values mv JOIN user_metrics um ON um.id = mv.metric_id 
         WHERE um.metric_name = g.goal_name AND mv.user_id = cp.user_id 
         ORDER BY mv.measurement_date DESC LIMIT 1), 
        gb.baseline_value) - gb.baseline_value) / NULLIF(g.target_value - gb.baseline_value, 0)) * 100, 2)
  END as progress_percent
FROM challenge_participants cp
JOIN goals g ON g.challenge_id = cp.challenge_id AND g.user_id = cp.user_id AND g.is_personal = false
LEFT JOIN goal_baselines gb ON gb.goal_id = g.id AND gb.user_id = cp.user_id
WHERE gb.baseline_value IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goal_baselines_user_goal ON public.goal_baselines(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_baselines_goal ON public.goal_baselines(goal_id);