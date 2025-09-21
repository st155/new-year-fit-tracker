-- Создаем bucket для загрузки файлов Apple Health
INSERT INTO storage.buckets (id, name, public) VALUES ('apple-health-uploads', 'apple-health-uploads', false);

-- Создаем RLS политики для Apple Health uploads
CREATE POLICY "Users can upload their own Apple Health files"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'apple-health-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own Apple Health files"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'apple-health-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own Apple Health files"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'apple-health-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);