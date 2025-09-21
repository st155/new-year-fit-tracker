-- Создаем таблицу для агрегированных данных по дням
CREATE TABLE public.daily_health_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  steps INTEGER,
  vo2_max NUMERIC(5,2),
  weight NUMERIC(6,2),
  heart_rate_avg NUMERIC(5,1),
  heart_rate_min INTEGER,
  heart_rate_max INTEGER,
  sleep_hours NUMERIC(4,2),
  active_calories INTEGER,
  resting_calories INTEGER,
  exercise_minutes INTEGER,
  distance_km NUMERIC(6,2),
  source_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Включаем RLS
ALTER TABLE public.daily_health_summary ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view their own daily health summary" 
ON public.daily_health_summary 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily health summary" 
ON public.daily_health_summary 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily health summary" 
ON public.daily_health_summary 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Триггер для обновления времени
CREATE TRIGGER update_daily_health_summary_updated_at
BEFORE UPDATE ON public.daily_health_summary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы для быстрого поиска
CREATE INDEX idx_daily_health_summary_user_date ON public.daily_health_summary(user_id, date DESC);
CREATE INDEX idx_daily_health_summary_date ON public.daily_health_summary(date DESC);

-- Создаем таблицу для детальных записей здоровья
CREATE TABLE public.health_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  record_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  source_name TEXT,
  source_version TEXT,
  device TEXT,
  metadata JSONB,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, external_id)
);

-- Включаем RLS для health_records
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- Политики RLS для health_records
CREATE POLICY "Users can view their own health records" 
ON public.health_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health records" 
ON public.health_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Индексы для health_records
CREATE INDEX idx_health_records_user_type_date ON public.health_records(user_id, record_type, start_date DESC);
CREATE INDEX idx_health_records_date ON public.health_records(start_date DESC);
CREATE INDEX idx_health_records_external_id ON public.health_records(external_id);

-- Функция для агрегации данных по дням
CREATE OR REPLACE FUNCTION public.aggregate_daily_health_data(p_user_id UUID, p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Вставляем или обновляем агрегированные данные за день
  INSERT INTO public.daily_health_summary (
    user_id, 
    date, 
    steps,
    vo2_max,
    weight,
    heart_rate_avg,
    heart_rate_min,
    heart_rate_max,
    sleep_hours,
    active_calories,
    resting_calories,
    exercise_minutes,
    distance_km,
    source_data
  )
  SELECT 
    p_user_id,
    p_date,
    MAX(CASE WHEN record_type = 'HKQuantityTypeIdentifierStepCount' THEN value END) as steps,
    MAX(CASE WHEN record_type = 'HKQuantityTypeIdentifierVO2Max' THEN value END) as vo2_max,
    AVG(CASE WHEN record_type = 'HKQuantityTypeIdentifierBodyMass' THEN value END) as weight,
    AVG(CASE WHEN record_type = 'HKQuantityTypeIdentifierHeartRate' THEN value END) as heart_rate_avg,
    MIN(CASE WHEN record_type = 'HKQuantityTypeIdentifierHeartRate' THEN value END) as heart_rate_min,
    MAX(CASE WHEN record_type = 'HKQuantityTypeIdentifierHeartRate' THEN value END) as heart_rate_max,
    SUM(CASE WHEN record_type = 'HKCategoryTypeIdentifierSleepAnalysis' THEN value END) / 3600 as sleep_hours,
    SUM(CASE WHEN record_type = 'HKQuantityTypeIdentifierActiveEnergyBurned' THEN value END) as active_calories,
    SUM(CASE WHEN record_type = 'HKQuantityTypeIdentifierBasalEnergyBurned' THEN value END) as resting_calories,
    SUM(CASE WHEN record_type = 'HKQuantityTypeIdentifierAppleExerciseTime' THEN value END) / 60 as exercise_minutes,
    SUM(CASE WHEN record_type = 'HKQuantityTypeIdentifierDistanceWalkingRunning' THEN value END) / 1000 as distance_km,
    jsonb_build_object(
      'records_count', COUNT(*),
      'aggregation_date', NOW(),
      'data_types', array_agg(DISTINCT record_type)
    ) as source_data
  FROM public.health_records 
  WHERE user_id = p_user_id 
    AND DATE(start_date) = p_date
  GROUP BY p_user_id, p_date
  HAVING COUNT(*) > 0
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    steps = EXCLUDED.steps,
    vo2_max = EXCLUDED.vo2_max,
    weight = EXCLUDED.weight,
    heart_rate_avg = EXCLUDED.heart_rate_avg,
    heart_rate_min = EXCLUDED.heart_rate_min,
    heart_rate_max = EXCLUDED.heart_rate_max,
    sleep_hours = EXCLUDED.sleep_hours,
    active_calories = EXCLUDED.active_calories,
    resting_calories = EXCLUDED.resting_calories,
    exercise_minutes = EXCLUDED.exercise_minutes,
    distance_km = EXCLUDED.distance_km,
    source_data = EXCLUDED.source_data,
    updated_at = NOW();
END;
$$;