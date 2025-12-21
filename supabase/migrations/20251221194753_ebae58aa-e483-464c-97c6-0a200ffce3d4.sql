-- Вставляем запись в terra_tokens для связи WHOOP с пользователем st@roosh.vc
INSERT INTO terra_tokens (
  user_id,
  provider,
  terra_user_id,
  is_active,
  last_sync_date,
  created_at,
  updated_at,
  metadata
) VALUES (
  'a527db40-3f7f-448f-8782-da632711e818',
  'WHOOP',
  'e8c6f9ae-509c-47b3-af79-4acec345c9e0',
  true,
  NOW(),
  NOW(),
  NOW(),
  '{}'::jsonb
)
ON CONFLICT (user_id, provider) 
DO UPDATE SET 
  terra_user_id = EXCLUDED.terra_user_id,
  is_active = true,
  last_sync_date = NOW(),
  updated_at = NOW();