-- Деактивировать все активные токены Whoop (прямая интеграция заменена на Terra)
UPDATE whoop_tokens 
SET is_active = false, 
    updated_at = NOW()
WHERE is_active = true;

-- Добавить комментарий к таблице для архивации
COMMENT ON TABLE whoop_tokens IS 
'⚠️ АРХИВ: Прямая интеграция Whoop удалена 2025-10-24. 
Whoop теперь работает через Terra API (таблица terra_tokens с provider=WHOOP).
Таблица сохранена для истории и возможного rollback.';

-- Добавить индекс для миграционных проверок
CREATE INDEX IF NOT EXISTS idx_whoop_tokens_archived 
ON whoop_tokens(user_id, created_at) 
WHERE is_active = false;