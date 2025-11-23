-- Create doctor_recommendations table for AI-extracted supplement recommendations from medical documents
CREATE TABLE IF NOT EXISTS public.doctor_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.medical_documents(id) ON DELETE CASCADE,
  supplement_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  rationale TEXT,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  doctor_name TEXT,
  prescription_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'added_to_stack', 'dismissed')),
  added_to_stack_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_doctor_recommendations_user_id ON public.doctor_recommendations(user_id);
CREATE INDEX idx_doctor_recommendations_document_id ON public.doctor_recommendations(document_id);
CREATE INDEX idx_doctor_recommendations_status ON public.doctor_recommendations(status);

-- Enable RLS
ALTER TABLE public.doctor_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own recommendations"
  ON public.doctor_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations"
  ON public.doctor_recommendations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON public.doctor_recommendations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert recommendations"
  ON public.doctor_recommendations
  FOR INSERT
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER set_doctor_recommendations_updated_at
  BEFORE UPDATE ON public.doctor_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();