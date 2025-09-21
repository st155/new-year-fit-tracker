-- Создаем таблицу для системы логирования ошибок
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  source TEXT NOT NULL, -- 'whoop', 'apple_health', 'garmin', 'ui', 'api', etc.
  stack_trace TEXT,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Users can view their own error logs" 
ON public.error_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own error logs" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Админы могут видеть все логи (если есть trainer_role)
CREATE POLICY "Trainers can view all error logs" 
ON public.error_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND trainer_role = true
));

-- Создаем индексы для быстрого поиска
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_source ON public.error_logs(source);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);

-- Триггер для автоматического обновления updated_at (если понадобится)
CREATE TRIGGER update_error_logs_updated_at
BEFORE UPDATE ON public.error_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();