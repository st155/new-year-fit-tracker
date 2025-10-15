-- Create storage bucket for InBody images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inbody-images', 'inbody-images', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for inbody-images bucket
CREATE POLICY "Users can upload their own InBody images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inbody-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own InBody images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inbody-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own InBody images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inbody-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add image_path column to inbody_uploads table
ALTER TABLE inbody_uploads 
ADD COLUMN IF NOT EXISTS image_path text;