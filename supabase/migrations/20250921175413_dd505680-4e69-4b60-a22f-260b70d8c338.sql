-- Увеличиваем лимит размера файла в bucket до 2GB для больших Apple Health архивов
UPDATE storage.buckets 
SET file_size_limit = 2147483648 -- 2GB в байтах
WHERE id = 'apple-health-uploads';