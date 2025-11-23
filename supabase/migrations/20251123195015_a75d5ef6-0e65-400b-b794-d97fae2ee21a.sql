-- Add processing status tracking to medical_documents
ALTER TABLE medical_documents 
ADD COLUMN processing_status TEXT DEFAULT 'pending' 
CHECK (processing_status IN ('pending', 'processing', 'completed', 'error'));

ALTER TABLE medical_documents 
ADD COLUMN processing_error TEXT;

ALTER TABLE medical_documents
ADD COLUMN processing_started_at TIMESTAMPTZ;

ALTER TABLE medical_documents
ADD COLUMN processing_completed_at TIMESTAMPTZ;

-- Create index for querying processing documents
CREATE INDEX idx_medical_documents_processing_status ON medical_documents(processing_status, user_id);

-- Create biomarker AI analysis cache table
CREATE TABLE biomarker_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biomarker_id UUID NOT NULL REFERENCES biomarker_master(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  insights TEXT,
  statistics JSONB,
  zones JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  results_count INT NOT NULL,
  latest_test_date TIMESTAMPTZ NOT NULL,
  UNIQUE(biomarker_id, user_id)
);

CREATE INDEX idx_biomarker_ai_analysis_user ON biomarker_ai_analysis(user_id);
CREATE INDEX idx_biomarker_ai_analysis_biomarker ON biomarker_ai_analysis(biomarker_id);

-- RLS policies
ALTER TABLE biomarker_ai_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI analysis"
  ON biomarker_ai_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage AI analysis cache"
  ON biomarker_ai_analysis FOR ALL
  USING (true)
  WITH CHECK (true);