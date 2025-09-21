-- Создаем таблицу для автоматически обнаруженных метрик пользователя
CREATE TABLE public.user_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL, -- 'fitness', 'health', 'sleep', 'recovery', 'workout'
  unit TEXT NOT NULL,
  source TEXT NOT NULL, -- 'whoop', 'apple_health', 'garmin', 'manual', 'ai_analysis'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, metric_name, unit, source)
);

-- Создаем таблицу для всех значений метрик (не связанных с целями)
CREATE TABLE public.metric_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_id UUID NOT NULL REFERENCES public.user_metrics(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  photo_url TEXT,
  source_data JSONB, -- дополнительные данные от трекера
  external_id TEXT, -- ID из внешней системы для предотвращения дублирования
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Предотвращаем дублирование данных из одного источника за один день
  UNIQUE(metric_id, measurement_date, external_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_user_metrics_user_category ON public.user_metrics (user_id, metric_category);
CREATE INDEX idx_metric_values_user_date ON public.metric_values (user_id, measurement_date DESC);
CREATE INDEX idx_metric_values_metric_date ON public.metric_values (metric_id, measurement_date DESC);

-- Включаем RLS
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_values ENABLE ROW LEVEL SECURITY;

-- Политики для user_metrics
CREATE POLICY "Users can view their own metrics" 
ON public.user_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics" 
ON public.user_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics" 
ON public.user_metrics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Политики для metric_values
CREATE POLICY "Users can view their own metric values" 
ON public.metric_values 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metric values" 
ON public.metric_values 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metric values" 
ON public.metric_values 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_user_metrics_updated_at
BEFORE UPDATE ON public.user_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Создаем функцию для автоматического создания метрик
CREATE OR REPLACE FUNCTION public.create_or_get_metric(
  p_user_id UUID,
  p_metric_name TEXT,
  p_metric_category TEXT,
  p_unit TEXT,
  p_source TEXT
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metric_id UUID;
BEGIN
  -- Пытаемся найти существующую метрику
  SELECT id INTO metric_id
  FROM public.user_metrics
  WHERE user_id = p_user_id 
    AND metric_name = p_metric_name 
    AND unit = p_unit 
    AND source = p_source;
  
  -- Если не найдена, создаем новую
  IF metric_id IS NULL THEN
    INSERT INTO public.user_metrics (user_id, metric_name, metric_category, unit, source)
    VALUES (p_user_id, p_metric_name, p_metric_category, p_unit, p_source)
    RETURNING id INTO metric_id;
  END IF;
  
  RETURN metric_id;
END;
$$;