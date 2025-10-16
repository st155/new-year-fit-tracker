-- Create medical documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/json'
  ]
);

-- Storage policies for medical-documents bucket
CREATE POLICY "Users can upload their own medical documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own medical documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own medical documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'medical-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own medical documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Trainers can view client medical documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-documents' AND
  EXISTS (
    SELECT 1
    FROM public.trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = ((storage.foldername(name))[1])::uuid
      AND tc.active = true
  )
);

-- Create medical_documents table
CREATE TABLE public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File information
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'inbody',
    'blood_test',
    'vo2max',
    'caliper',
    'prescription',
    'fitness_report',
    'progress_photo',
    'training_program',
    'other'
  )),
  file_size INTEGER,
  mime_type TEXT,
  
  -- Dates
  document_date DATE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- AI processing
  ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_summary TEXT,
  ai_extracted_data JSONB,
  
  -- Metadata
  tags TEXT[],
  notes TEXT,
  
  -- Comparison
  compared_with UUID[],
  comparison_results JSONB,
  
  -- Privacy
  hidden_from_trainer BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique storage path per user
  UNIQUE(user_id, storage_path)
);

-- Create indexes for performance
CREATE INDEX idx_medical_docs_user_id ON public.medical_documents(user_id);
CREATE INDEX idx_medical_docs_user_type ON public.medical_documents(user_id, document_type);
CREATE INDEX idx_medical_docs_user_date ON public.medical_documents(user_id, document_date DESC NULLS LAST);
CREATE INDEX idx_medical_docs_ai_processed ON public.medical_documents(user_id, ai_processed);
CREATE INDEX idx_medical_docs_type_date ON public.medical_documents(document_type, document_date DESC NULLS LAST);

-- Enable RLS
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medical_documents
CREATE POLICY "Users can view their own medical documents"
ON public.medical_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical documents"
ON public.medical_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical documents"
ON public.medical_documents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medical documents"
ON public.medical_documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view client medical documents (except hidden)"
ON public.medical_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = medical_documents.user_id
      AND tc.active = true
  )
  AND hidden_from_trainer = false
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_medical_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_medical_documents_updated_at
BEFORE UPDATE ON public.medical_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_medical_documents_updated_at();