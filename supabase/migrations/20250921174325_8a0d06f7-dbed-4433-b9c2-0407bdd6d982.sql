-- Увеличиваем лимит размера файла в Storage bucket до 1GB для Apple Health данных
UPDATE storage.buckets 
SET file_size_limit = 1073741824 -- 1GB в байтах
WHERE id = 'apple-health-uploads';

-- Также добавляем ограничения на MIME-типы для безопасности
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/zip', 'application/x-zip-compressed']
WHERE id = 'apple-health-uploads';