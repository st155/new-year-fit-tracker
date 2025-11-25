-- Reset stuck documents that have been processing for more than 1 hour
UPDATE medical_documents 
SET 
  processing_status = 'pending',
  processing_started_at = NULL
WHERE 
  processing_status = 'processing' 
  AND processing_started_at < NOW() - INTERVAL '1 hour';

-- Add comment
COMMENT ON TABLE medical_documents IS 'Medical documents table with processing status tracking';