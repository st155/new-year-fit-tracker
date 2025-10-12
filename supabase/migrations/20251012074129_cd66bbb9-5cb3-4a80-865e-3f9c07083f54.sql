-- Создаем storage bucket для данных от Terra API
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'terra-payloads',
  'terra-payloads',
  false,
  52428800, -- 50MB лимит
  ARRAY['application/json']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS политики для terra-payloads bucket
-- Разрешаем service_role создавать файлы (для Terra API)
CREATE POLICY "Service role can upload terra payloads"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'terra-payloads');

-- Пользователи могут читать свои файлы
CREATE POLICY "Users can read their terra payloads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'terra-payloads' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Админы могут читать все файлы
CREATE POLICY "Admins can read all terra payloads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'terra-payloads'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);