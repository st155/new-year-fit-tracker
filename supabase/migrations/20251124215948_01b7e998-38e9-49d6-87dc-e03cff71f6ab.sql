-- Phase 2: Add processing_error_details column for detailed error tracking
ALTER TABLE medical_documents 
ADD COLUMN processing_error_details jsonb;

-- Create index for querying errors by type
CREATE INDEX idx_medical_documents_error_details 
ON medical_documents USING gin(processing_error_details);

-- Comment
COMMENT ON COLUMN medical_documents.processing_error_details IS 
'Detailed error information including: error_type, error_message, stack_trace, gemini_response, pdf_info, timestamp';