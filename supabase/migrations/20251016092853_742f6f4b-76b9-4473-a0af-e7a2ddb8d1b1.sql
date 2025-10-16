-- Add migration tracking fields to existing tables
ALTER TABLE public.inbody_uploads
ADD COLUMN IF NOT EXISTS migrated_to_document_id UUID REFERENCES public.medical_documents(id);

ALTER TABLE public.inbody_analyses
ADD COLUMN IF NOT EXISTS migrated_to_document_id UUID REFERENCES public.medical_documents(id);

ALTER TABLE public.body_composition
ADD COLUMN IF NOT EXISTS migrated_photo_before_id UUID REFERENCES public.medical_documents(id),
ADD COLUMN IF NOT EXISTS migrated_photo_after_id UUID REFERENCES public.medical_documents(id);

-- Create index for faster migration lookups
CREATE INDEX IF NOT EXISTS idx_inbody_uploads_migrated ON public.inbody_uploads(migrated_to_document_id) WHERE migrated_to_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inbody_analyses_migrated ON public.inbody_analyses(migrated_to_document_id) WHERE migrated_to_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_body_composition_photos_migrated ON public.body_composition(migrated_photo_before_id, migrated_photo_after_id);