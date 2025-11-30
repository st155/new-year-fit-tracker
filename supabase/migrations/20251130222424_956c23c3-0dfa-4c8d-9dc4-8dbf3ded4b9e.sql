-- Fix category for imaging documents that have medical_findings
-- These documents were incorrectly classified as 'other' instead of 'imaging_report'

UPDATE medical_documents
SET 
  category = 'imaging_report',
  updated_at = now()
WHERE id IN (
  SELECT DISTINCT document_id 
  FROM medical_findings
)
AND category != 'imaging_report';

-- Create index on medical_findings.document_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_medical_findings_document_id 
ON medical_findings(document_id);