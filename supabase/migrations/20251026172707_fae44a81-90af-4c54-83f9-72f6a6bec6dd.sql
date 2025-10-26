-- Исправляем существующие токены: устанавливаем is_active=true для всех токенов с недавней синхронизацией
UPDATE terra_tokens 
SET is_active = true, updated_at = now()
WHERE last_sync_date IS NOT NULL 
  AND last_sync_date > (now() - interval '7 days');