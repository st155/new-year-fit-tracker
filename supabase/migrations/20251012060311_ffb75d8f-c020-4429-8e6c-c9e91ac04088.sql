-- Расширяем таблицу terra_tokens для поддержки множественных провайдеров

-- Удаляем уникальное ограничение на user_id, чтобы один пользователь мог подключить несколько устройств
ALTER TABLE public.terra_tokens DROP CONSTRAINT IF EXISTS terra_tokens_user_id_key;

-- Добавляем поля для расширенной функциональности
ALTER TABLE public.terra_tokens 
  ADD COLUMN IF NOT EXISTS last_sync_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Создаем уникальное ограничение на комбинацию user_id и provider
-- чтобы один пользователь мог подключить разные устройства, но не дубликаты одного типа
ALTER TABLE public.terra_tokens 
  ADD CONSTRAINT terra_tokens_user_provider_key UNIQUE (user_id, provider);

-- Создаем индекс для быстрого поиска по user_id и активным подключениям
CREATE INDEX IF NOT EXISTS idx_terra_tokens_user_active 
  ON public.terra_tokens(user_id, is_active) 
  WHERE is_active = true;

-- Создаем индекс для быстрого поиска по terra_user_id
CREATE INDEX IF NOT EXISTS idx_terra_tokens_terra_user 
  ON public.terra_tokens(terra_user_id);

-- Добавляем комментарии для документации
COMMENT ON COLUMN public.terra_tokens.provider IS 'Тип подключенного устройства: ULTRAHUMAN, WHOOP, GARMIN, FITBIT, OURA, APPLE_HEALTH, WITHINGS';
COMMENT ON COLUMN public.terra_tokens.last_sync_date IS 'Дата последней успешной синхронизации данных';
COMMENT ON COLUMN public.terra_tokens.metadata IS 'Дополнительная информация о подключении (настройки, скопы данных и т.д.)';
COMMENT ON COLUMN public.terra_tokens.is_active IS 'Активно ли подключение (false = отключено пользователем)';
