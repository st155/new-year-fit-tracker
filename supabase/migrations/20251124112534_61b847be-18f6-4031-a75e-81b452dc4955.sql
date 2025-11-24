-- Create storage bucket for supplement photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplement-photos',
  'supplement-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS Policy: Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload their supplement photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplement-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Everyone can view photos (public bucket)
CREATE POLICY "Public can view supplement photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'supplement-photos');

-- RLS Policy: Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplement-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);