-- Удаляем старые дублирующиеся токены, оставляя только самый свежий для каждого пользователя
DELETE FROM whoop_tokens
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM whoop_tokens
  ORDER BY user_id, updated_at DESC
);

-- Добавляем уникальный индекс чтобы предотвратить будущие дубликаты
CREATE UNIQUE INDEX IF NOT EXISTS whoop_tokens_user_id_unique ON whoop_tokens(user_id);