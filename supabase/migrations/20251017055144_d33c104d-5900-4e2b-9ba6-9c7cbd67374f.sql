-- Одноразовая миграция: проставляем client_id для существующих токенов Whoop
-- Обновляем все активные токены Whoop, у которых нет client_id
UPDATE whoop_tokens
SET client_id = (SELECT COALESCE(nullif(current_setting('app.whoop_client_id', true), ''), 'your_whoop_client_id'))
WHERE is_active = true 
  AND (client_id IS NULL OR client_id = '');