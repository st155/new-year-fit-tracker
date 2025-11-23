-- Add file_hash column to medical_documents table for duplicate detection
ALTER TABLE medical_documents 
ADD COLUMN file_hash TEXT;

-- Create index for fast duplicate lookups
CREATE INDEX idx_medical_documents_file_hash 
ON medical_documents(user_id, file_hash) 
WHERE file_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN medical_documents.file_hash IS 'SHA-256 hash of file content for duplicate detection';