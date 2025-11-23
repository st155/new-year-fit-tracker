-- Change default value for hidden_from_trainer to TRUE
-- Medical documents should be HIDDEN from trainers by default for privacy
ALTER TABLE public.medical_documents 
ALTER COLUMN hidden_from_trainer SET DEFAULT true;

-- Update existing documents to be hidden from trainers
-- Users can explicitly share documents with trainers through the UI
UPDATE public.medical_documents
SET hidden_from_trainer = true
WHERE hidden_from_trainer = false;

COMMENT ON COLUMN public.medical_documents.hidden_from_trainer IS 'Default true - documents are private by default, users can explicitly share with trainers';