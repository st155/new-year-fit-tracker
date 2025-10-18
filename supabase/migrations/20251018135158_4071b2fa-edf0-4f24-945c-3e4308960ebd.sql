-- Add fasting_windows table for Intermittent Fasting tracking
CREATE TABLE IF NOT EXISTS public.fasting_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  eating_start TIMESTAMP WITH TIME ZONE NOT NULL,
  eating_end TIMESTAMP WITH TIME ZONE,
  fasting_duration INTEGER, -- minutes of fasting
  eating_duration INTEGER, -- minutes of eating window
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add ai_motivation field to habits table
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS ai_motivation JSONB DEFAULT '{}'::jsonb;

-- Enable RLS
ALTER TABLE public.fasting_windows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fasting_windows
CREATE POLICY "Users can view their own fasting windows"
  ON public.fasting_windows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fasting windows"
  ON public.fasting_windows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fasting windows"
  ON public.fasting_windows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fasting windows"
  ON public.fasting_windows FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fasting_windows_user_id ON public.fasting_windows(user_id);
CREATE INDEX IF NOT EXISTS idx_fasting_windows_habit_id ON public.fasting_windows(habit_id);
CREATE INDEX IF NOT EXISTS idx_fasting_windows_created_at ON public.fasting_windows(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_fasting_windows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fasting_windows_updated_at
  BEFORE UPDATE ON public.fasting_windows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fasting_windows_updated_at();