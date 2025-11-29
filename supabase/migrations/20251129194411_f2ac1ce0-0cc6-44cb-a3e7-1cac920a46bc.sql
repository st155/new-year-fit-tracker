-- Backfill image_url for supplement_products that have files in Storage
UPDATE supplement_products sp
SET image_url = CONCAT(
  'https://d.elite10.club/storage/v1/object/public/supplement-images/', 
  li.file_name
)
FROM (
  SELECT DISTINCT ON (split_part(name, '_', 1))
    split_part(name, '_', 1) as product_id,
    name as file_name
  FROM storage.objects
  WHERE bucket_id = 'supplement-images'
  ORDER BY split_part(name, '_', 1), created_at DESC
) li
WHERE sp.id::text = li.product_id
AND sp.image_url IS NULL;