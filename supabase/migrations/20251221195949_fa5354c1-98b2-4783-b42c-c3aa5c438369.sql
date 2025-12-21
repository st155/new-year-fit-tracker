-- Активируем WHOOP токен для пользователя st@roosh.vc
UPDATE terra_tokens 
SET 
  is_active = true,
  last_sync_date = NOW(),
  updated_at = NOW()
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818'
  AND provider = 'WHOOP'
  AND terra_user_id = 'e8c6f9ae-509c-47b3-af79-4acec345c9e0';