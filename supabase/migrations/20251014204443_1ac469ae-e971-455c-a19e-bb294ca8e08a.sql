-- Create inbody_uploads table for tracking PDF uploads
CREATE TABLE public.inbody_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'failed')),
  analysis_id UUID REFERENCES public.inbody_analyses(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inbody_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own uploads"
  ON public.inbody_uploads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
  ON public.inbody_uploads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads"
  ON public.inbody_uploads
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
  ON public.inbody_uploads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_inbody_uploads_user_status ON public.inbody_uploads(user_id, status);
CREATE INDEX idx_inbody_uploads_analysis ON public.inbody_uploads(analysis_id);

-- Trigger to update updated_at
CREATE TRIGGER update_inbody_uploads_updated_at
  BEFORE UPDATE ON public.inbody_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();