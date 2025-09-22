-- Create tables for Withings integration
CREATE TABLE IF NOT EXISTS public.withings_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.withings_oauth_states (
  state UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_withings_tokens_user_id ON public.withings_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_oauth_states_user_id ON public.withings_oauth_states(user_id);

-- Enable RLS
ALTER TABLE public.withings_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withings_oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS policies for withings_tokens
CREATE POLICY "Users can view their own withings tokens" 
ON public.withings_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withings tokens" 
ON public.withings_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withings tokens" 
ON public.withings_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for withings_oauth_states (no access via API)
CREATE POLICY "withings_oauth_states_select_none" 
ON public.withings_oauth_states 
FOR SELECT 
USING (false);

CREATE POLICY "withings_oauth_states_insert_none" 
ON public.withings_oauth_states 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "withings_oauth_states_update_none" 
ON public.withings_oauth_states 
FOR UPDATE 
USING (false);

CREATE POLICY "withings_oauth_states_delete_none" 
ON public.withings_oauth_states 
FOR DELETE 
USING (false);

-- Add trigger for updated_at
CREATE TRIGGER update_withings_tokens_updated_at
BEFORE UPDATE ON public.withings_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add workouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_type TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  distance_km NUMERIC,
  calories_burned INTEGER,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  source_data JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on workouts
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for workouts
CREATE POLICY "Users can view their own workouts" 
ON public.workouts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workouts" 
ON public.workouts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" 
ON public.workouts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes for workouts
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_external_id ON public.workouts(external_id);
CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON public.workouts(start_time);

-- Add trigger for workouts updated_at
CREATE TRIGGER update_workouts_updated_at
BEFORE UPDATE ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();