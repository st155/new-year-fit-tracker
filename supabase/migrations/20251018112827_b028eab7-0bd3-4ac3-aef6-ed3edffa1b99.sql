-- Create client_aliases table for matching mentioned names with real users
CREATE TABLE IF NOT EXISTS public.client_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_count INTEGER DEFAULT 1,
  UNIQUE(trainer_id, client_id, alias_name)
);

-- Enable RLS
ALTER TABLE public.client_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view their own aliases"
  ON public.client_aliases
  FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert their own aliases"
  ON public.client_aliases
  FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their own aliases"
  ON public.client_aliases
  FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own aliases"
  ON public.client_aliases
  FOR DELETE
  USING (auth.uid() = trainer_id);

-- Create index for faster lookups
CREATE INDEX idx_client_aliases_trainer_alias ON public.client_aliases(trainer_id, alias_name);
CREATE INDEX idx_client_aliases_used_count ON public.client_aliases(used_count DESC);