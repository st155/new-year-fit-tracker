-- Create ai_goal_suggestions table for storing AI-generated goal adjustment recommendations
CREATE TABLE IF NOT EXISTS public.ai_goal_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES profiles(user_id) NOT NULL,
  client_id UUID REFERENCES profiles(user_id) NOT NULL,
  goal_id UUID REFERENCES goals(id),
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('adjust_target', 'new_goal', 'change_deadline', 'pause_goal', 'celebrate')),
  
  -- AI analysis
  current_progress NUMERIC,
  progress_trend TEXT CHECK (progress_trend IN ('ahead', 'on_track', 'behind', 'stagnant')),
  recommendation_text TEXT NOT NULL,
  
  -- Suggested changes
  suggested_action JSONB,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  priority INTEGER CHECK (priority >= 1 AND priority <= 5),
  
  -- Metadata
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'dismissed')),
  applied_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suggestions_trainer ON public.ai_goal_suggestions(trainer_id, status);
CREATE INDEX IF NOT EXISTS idx_suggestions_client ON public.ai_goal_suggestions(client_id, status);
CREATE INDEX IF NOT EXISTS idx_suggestions_goal ON public.ai_goal_suggestions(goal_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON public.ai_goal_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_goal_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view their client suggestions"
  ON public.ai_goal_suggestions
  FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR
    client_id IN (
      SELECT client_id FROM trainer_clients 
      WHERE trainer_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Trainers can insert suggestions for their clients"
  ON public.ai_goal_suggestions
  FOR INSERT
  WITH CHECK (
    trainer_id = auth.uid()
    OR
    client_id IN (
      SELECT client_id FROM trainer_clients 
      WHERE trainer_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Trainers can update their client suggestions"
  ON public.ai_goal_suggestions
  FOR UPDATE
  USING (
    trainer_id = auth.uid()
    OR
    client_id IN (
      SELECT client_id FROM trainer_clients 
      WHERE trainer_id = auth.uid() AND active = true
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ai_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_suggestions_updated_at
  BEFORE UPDATE ON public.ai_goal_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_suggestions_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_goal_suggestions;