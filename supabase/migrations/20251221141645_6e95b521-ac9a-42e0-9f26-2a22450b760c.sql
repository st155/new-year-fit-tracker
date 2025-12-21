-- Create table for storing all types of doctor recommendations (supplements, exercises, tests, etc.)
CREATE TABLE public.doctor_action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.medical_documents(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('supplement', 'exercise', 'lifestyle', 'test', 'medication', 'consultation')),
  name TEXT NOT NULL,
  details TEXT,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  schedule TEXT, -- e.g., "1-0-1" format
  rationale TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'dismissed', 'added_to_library')),
  doctor_name TEXT,
  prescription_date DATE,
  confidence_score NUMERIC,
  added_to_library_at TIMESTAMPTZ,
  protocol_tag TEXT, -- e.g., "Протокол Dr. Dynyak Andrey - Декабрь 2025"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_doctor_action_items_user_id ON public.doctor_action_items(user_id);
CREATE INDEX idx_doctor_action_items_document_id ON public.doctor_action_items(document_id);
CREATE INDEX idx_doctor_action_items_action_type ON public.doctor_action_items(action_type);
CREATE INDEX idx_doctor_action_items_status ON public.doctor_action_items(status);

-- Enable Row Level Security
ALTER TABLE public.doctor_action_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own action items"
  ON public.doctor_action_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action items"
  ON public.doctor_action_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action items"
  ON public.doctor_action_items
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own action items"
  ON public.doctor_action_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_doctor_action_items_updated_at
  BEFORE UPDATE ON public.doctor_action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();