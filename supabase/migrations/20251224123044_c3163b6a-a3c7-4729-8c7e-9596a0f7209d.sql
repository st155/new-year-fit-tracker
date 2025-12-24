-- Wellness Plans table - stores user's activity schedules
CREATE TABLE public.wellness_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER DEFAULT 4,
  activities_config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'paused')),
  start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Wellness Activities table - individual scheduled activities
CREATE TABLE public.wellness_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.wellness_plans(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  name TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  duration_minutes INTEGER,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_wellness_plans_user_id ON public.wellness_plans(user_id);
CREATE INDEX idx_wellness_plans_status ON public.wellness_plans(status);
CREATE INDEX idx_wellness_activities_user_id ON public.wellness_activities(user_id);
CREATE INDEX idx_wellness_activities_plan_id ON public.wellness_activities(plan_id);
CREATE INDEX idx_wellness_activities_scheduled_date ON public.wellness_activities(scheduled_date);
CREATE INDEX idx_wellness_activities_type ON public.wellness_activities(activity_type);

-- Enable RLS
ALTER TABLE public.wellness_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wellness_plans
CREATE POLICY "Users can view their own wellness plans" 
  ON public.wellness_plans FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wellness plans" 
  ON public.wellness_plans FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wellness plans" 
  ON public.wellness_plans FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wellness plans" 
  ON public.wellness_plans FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for wellness_activities
CREATE POLICY "Users can view their own wellness activities" 
  ON public.wellness_activities FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wellness activities" 
  ON public.wellness_activities FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wellness activities" 
  ON public.wellness_activities FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wellness activities" 
  ON public.wellness_activities FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_wellness_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_wellness_plans_updated_at
  BEFORE UPDATE ON public.wellness_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wellness_updated_at();

CREATE TRIGGER update_wellness_activities_updated_at
  BEFORE UPDATE ON public.wellness_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wellness_updated_at();