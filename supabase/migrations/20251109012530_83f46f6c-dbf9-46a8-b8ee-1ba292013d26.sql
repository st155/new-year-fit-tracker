-- Create challenge_templates table
CREATE TABLE IF NOT EXISTS public.challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  
  -- Template configuration
  duration_weeks INTEGER,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 0 AND 3),
  target_audience INTEGER CHECK (target_audience BETWEEN 0 AND 3),
  
  -- AI preset reference
  preset_id TEXT,
  
  -- Template data (JSONB)
  template_data JSONB NOT NULL,
  
  -- Sharing and usage
  is_public BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT template_name_unique UNIQUE (created_by, template_name)
);

-- Indexes
CREATE INDEX idx_templates_created_by ON public.challenge_templates(created_by);
CREATE INDEX idx_templates_category ON public.challenge_templates(category);
CREATE INDEX idx_templates_public ON public.challenge_templates(is_public) WHERE is_public = TRUE;

-- Enable RLS
ALTER TABLE public.challenge_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view own templates"
  ON public.challenge_templates FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Anyone can view public templates"
  ON public.challenge_templates FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Trainers can create templates"
  ON public.challenge_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Trainers can update own templates"
  ON public.challenge_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Trainers can delete own templates"
  ON public.challenge_templates FOR DELETE
  USING (created_by = auth.uid());

-- Add to realtime (if supported)
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_templates;