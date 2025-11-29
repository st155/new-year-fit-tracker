-- Create storage bucket for supplement product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplement-images', 'supplement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public read access for all supplement images
CREATE POLICY "Public read access for supplement images" 
ON storage.objects
FOR SELECT 
USING (bucket_id = 'supplement-images');

-- Policy: Authenticated users can upload supplement images
CREATE POLICY "Authenticated upload access for supplement images" 
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'supplement-images' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can update their own uploaded supplement images
CREATE POLICY "Authenticated update access for supplement images" 
ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'supplement-images' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can delete supplement images
CREATE POLICY "Authenticated delete access for supplement images" 
ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'supplement-images' 
  AND auth.role() = 'authenticated'
);