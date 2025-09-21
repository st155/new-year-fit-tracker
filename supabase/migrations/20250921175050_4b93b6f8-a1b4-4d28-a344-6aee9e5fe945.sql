-- Проверяем текущие настройки storage buckets и все ограничения
SELECT 
  id,
  name, 
  public,
  file_size_limit,
  allowed_mime_types,
  avif_autodetection,
  created_at,
  updated_at
FROM storage.buckets 
ORDER BY name;

-- Также проверим есть ли другие глобальные настройки
SELECT * FROM storage.migrations ORDER BY version DESC LIMIT 5;