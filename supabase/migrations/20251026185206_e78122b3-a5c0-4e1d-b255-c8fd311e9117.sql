-- Разрешить NULL значения для колонок, которые могут быть неизвестны при получении webhook
ALTER TABLE terra_webhooks_raw 
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN provider DROP NOT NULL;

-- Добавить индекс для быстрого поиска необработанных webhooks
CREATE INDEX IF NOT EXISTS idx_terra_webhooks_raw_status_created 
  ON terra_webhooks_raw(status, created_at DESC) 
  WHERE status = 'pending';