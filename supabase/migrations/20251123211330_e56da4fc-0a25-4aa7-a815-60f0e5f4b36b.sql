-- ============================================
-- BioStack v3.1: Universal Medical Data Schema
-- Phase 0: Database Schema Foundation
-- ============================================

-- 1. Add document category enum to medical_documents
ALTER TABLE medical_documents 
ADD COLUMN IF NOT EXISTS category TEXT 
CHECK (category IN ('lab_blood', 'lab_urine', 'lab_microbiome', 'imaging_report', 'clinical_note')) 
DEFAULT 'lab_blood';

-- Migrate existing blood_test documents to lab_blood category
UPDATE medical_documents 
SET category = 'lab_blood' 
WHERE document_type = 'blood_test' AND category IS NULL;

-- Add AI summary column for text-heavy reports (MRI, USG, Clinical Notes)
ALTER TABLE medical_documents 
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Create index on category for efficient filtering
CREATE INDEX IF NOT EXISTS idx_medical_documents_category ON medical_documents(category);

-- 2. Add qualitative data support to lab_test_results
-- Make normalized_value nullable to support text-only results
ALTER TABLE lab_test_results 
ALTER COLUMN normalized_value DROP NOT NULL;

-- Add text_value column for qualitative results (e.g., "Negative", "Positive")
ALTER TABLE lab_test_results 
ADD COLUMN IF NOT EXISTS text_value TEXT;

-- Create index on text_value for filtering qualitative results
CREATE INDEX IF NOT EXISTS idx_lab_test_results_text_value ON lab_test_results(text_value) WHERE text_value IS NOT NULL;

-- 3. Add data_type enum to biomarker_master
ALTER TABLE biomarker_master 
ADD COLUMN IF NOT EXISTS data_type TEXT 
CHECK (data_type IN ('quantitative', 'qualitative', 'compositional')) 
DEFAULT 'quantitative';

-- 4. Create NEW medical_findings table for imaging/clinical reports
CREATE TABLE IF NOT EXISTS medical_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  body_part TEXT NOT NULL,
  finding_text TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('normal', 'mild', 'moderate', 'severe')) DEFAULT 'normal',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_medical_findings_document_id ON medical_findings(document_id);
CREATE INDEX IF NOT EXISTS idx_medical_findings_body_part ON medical_findings(body_part);
CREATE INDEX IF NOT EXISTS idx_medical_findings_severity ON medical_findings(severity);
CREATE INDEX IF NOT EXISTS idx_medical_findings_tags ON medical_findings USING GIN(tags);

-- Enable RLS on medical_findings
ALTER TABLE medical_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own medical findings
CREATE POLICY "Users can view their own medical findings" ON medical_findings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medical_documents md
      WHERE md.id = medical_findings.document_id
      AND md.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own medical findings
CREATE POLICY "Users can insert their own medical findings" ON medical_findings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_documents md
      WHERE md.id = medical_findings.document_id
      AND md.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own medical findings
CREATE POLICY "Users can update their own medical findings" ON medical_findings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM medical_documents md
      WHERE md.id = medical_findings.document_id
      AND md.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete their own medical findings
CREATE POLICY "Users can delete their own medical findings" ON medical_findings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM medical_documents md
      WHERE md.id = medical_findings.document_id
      AND md.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at on medical_findings
CREATE OR REPLACE FUNCTION update_medical_findings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER medical_findings_updated_at
  BEFORE UPDATE ON medical_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_findings_updated_at();

-- 5. Create user_biomarker_preferences table (Module B: Biomarker Governance)
CREATE TABLE IF NOT EXISTS user_biomarker_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biomarker_id UUID NOT NULL REFERENCES biomarker_master(id) ON DELETE CASCADE,
  optimal_min NUMERIC NOT NULL,
  optimal_max NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, biomarker_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_biomarker_preferences_user_id ON user_biomarker_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_biomarker_preferences_biomarker_id ON user_biomarker_preferences(biomarker_id);

-- Enable RLS
ALTER TABLE user_biomarker_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own biomarker preferences
CREATE POLICY "Users can view their own biomarker preferences" ON user_biomarker_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biomarker preferences" ON user_biomarker_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biomarker preferences" ON user_biomarker_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biomarker preferences" ON user_biomarker_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER user_biomarker_preferences_updated_at
  BEFORE UPDATE ON user_biomarker_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_findings_updated_at();

-- 6. Extend user_stack for time-bound protocols (Module D: Lifecycle Engine)
-- Add status column
ALTER TABLE user_stack 
ADD COLUMN IF NOT EXISTS status TEXT 
CHECK (status IN ('draft', 'active', 'completed')) 
DEFAULT 'draft';

-- Add source column
ALTER TABLE user_stack 
ADD COLUMN IF NOT EXISTS source TEXT 
CHECK (source IN ('manual', 'doctor_rx', 'ai_suggestion')) 
DEFAULT 'manual';

-- Add time-bound protocol fields
ALTER TABLE user_stack 
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE user_stack 
ADD COLUMN IF NOT EXISTS planned_end_date DATE;

ALTER TABLE user_stack 
ADD COLUMN IF NOT EXISTS end_action TEXT 
CHECK (end_action IN ('prompt_retest', 'none')) 
DEFAULT 'prompt_retest';

-- Create indexes for efficient lifecycle queries
CREATE INDEX IF NOT EXISTS idx_user_stack_status ON user_stack(status);
CREATE INDEX IF NOT EXISTS idx_user_stack_planned_end_date ON user_stack(planned_end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_stack_source ON user_stack(source);

-- Update existing active stacks to have proper status
UPDATE user_stack 
SET status = 'active' 
WHERE is_active = true AND status = 'draft';

-- ============================================
-- Phase 0 Complete: Foundation is Ready
-- ============================================

COMMENT ON TABLE medical_findings IS 'Stores qualitative findings from imaging reports (MRI, USG) and clinical notes';
COMMENT ON TABLE user_biomarker_preferences IS 'Stores user-defined optimal ranges for biomarkers (biohacker ranges)';
COMMENT ON COLUMN user_stack.status IS 'Protocol lifecycle status: draft, active, completed';
COMMENT ON COLUMN user_stack.source IS 'Origin of the stack: manual, doctor_rx, ai_suggestion';
COMMENT ON COLUMN user_stack.end_action IS 'Action to take when protocol completes: prompt_retest or none';