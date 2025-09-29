-- Создаем таблицу для связи Whoop user_id с нашими пользователями
CREATE TABLE public.whoop_user_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whoop_user_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(whoop_user_id)
);

-- Включаем RLS
ALTER TABLE public.whoop_user_mapping ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
CREATE POLICY "Users can view their own whoop mapping" 
ON public.whoop_user_mapping 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whoop mapping" 
ON public.whoop_user_mapping 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own whoop mapping" 
ON public.whoop_user_mapping 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Политика для service role (для webhooks)
CREATE POLICY "Service role can access whoop mapping" 
ON public.whoop_user_mapping 
FOR ALL 
USING (true);

-- Создаем триггер для обновления updated_at
CREATE TRIGGER update_whoop_user_mapping_updated_at
BEFORE UPDATE ON public.whoop_user_mapping
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Индекс для быстрого поиска по whoop_user_id
CREATE INDEX idx_whoop_user_mapping_whoop_user_id ON public.whoop_user_mapping(whoop_user_id);