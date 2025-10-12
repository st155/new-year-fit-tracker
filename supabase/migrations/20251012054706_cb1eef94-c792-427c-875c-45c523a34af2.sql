-- Создать таблицу для хранения Terra токенов
CREATE TABLE IF NOT EXISTS public.terra_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  terra_user_id TEXT NOT NULL,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Включить RLS
ALTER TABLE public.terra_tokens ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Users can insert their own terra tokens"
  ON public.terra_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own terra tokens"
  ON public.terra_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own terra tokens"
  ON public.terra_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_terra_tokens_user_id ON public.terra_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_tokens_terra_user_id ON public.terra_tokens(terra_user_id);