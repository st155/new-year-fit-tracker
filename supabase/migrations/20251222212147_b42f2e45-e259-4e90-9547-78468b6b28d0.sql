-- Add document_id column to inbody_analyses to link with medical_documents
ALTER TABLE inbody_analyses
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES medical_documents(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inbody_analyses_document_id ON inbody_analyses(document_id);

-- Update stuck InBody documents to pending status for reprocessing
UPDATE medical_documents 
SET processing_status = 'pending',
    processing_error = NULL,
    processing_error_details = NULL,
    processing_started_at = NULL,
    processing_completed_at = NULL
WHERE id IN (
  '279e3451-bfc9-47fb-bd30-386b4085751c',
  '5efae644-d313-451c-9391-2d27f71bb02a'
);

COMMENT ON COLUMN inbody_analyses.document_id IS 'Reference to source medical document that was parsed to create this InBody analysis';