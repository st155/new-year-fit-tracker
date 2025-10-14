-- Создаем запись в terra_tokens для Withings подключения
INSERT INTO terra_tokens (
  user_id,
  terra_user_id,
  provider,
  is_active,
  last_sync_date,
  created_at,
  updated_at
) VALUES (
  'a527db40-3f7f-448f-8782-da6327f1e818'::uuid,
  'ef2c28ec-9a90-4305-a2a6-046d72f40d88',
  'WITHINGS',
  true,
  NOW(),
  '2025-10-14T08:21:00.958597+00:00'::timestamp with time zone,
  NOW()
) ON CONFLICT (user_id, provider) 
DO UPDATE SET
  terra_user_id = EXCLUDED.terra_user_id,
  is_active = true,
  updated_at = NOW();