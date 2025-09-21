-- Создаем таблицу для хранения токенов Whoop
CREATE TABLE public.whoop_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Добавляем поля в таблицу measurements для интеграций
ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS whoop_id TEXT,
ADD COLUMN IF NOT EXISTS apple_health_id TEXT;

-- Создаем уникальные индексы для предотвращения дублирования данных из интеграций
CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_whoop_unique 
ON public.measurements (user_id, whoop_id) 
WHERE whoop_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_apple_health_unique 
ON public.measurements (user_id, apple_health_id) 
WHERE apple_health_id IS NOT NULL;

-- Включаем RLS для таблицы whoop_tokens
ALTER TABLE public.whoop_tokens ENABLE ROW LEVEL SECURITY;

-- Создаем политики для whoop_tokens
CREATE POLICY "Users can view their own whoop tokens" 
ON public.whoop_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whoop tokens" 
ON public.whoop_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own whoop tokens" 
ON public.whoop_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_whoop_tokens_updated_at
BEFORE UPDATE ON public.whoop_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();