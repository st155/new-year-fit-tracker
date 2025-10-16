-- Increase file size limit for medical-documents bucket to 150MB
UPDATE storage.buckets 
SET file_size_limit = 157286400 
WHERE id = 'medical-documents';