-- Создаем таблицу для маппинга метрик между разными источниками
CREATE TABLE IF NOT EXISTS public.metric_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_metric_name TEXT NOT NULL,
  unified_metric_category TEXT NOT NULL,
  unified_unit TEXT NOT NULL,
  aggregation_method TEXT NOT NULL DEFAULT 'average',
  device_mappings JSONB NOT NULL DEFAULT '{}',
  priority_order TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unified_metric_name)
);

-- Добавляем комментарии для документации
COMMENT ON TABLE public.metric_mappings IS 'Маппинг метрик между разными девайсами для unified view';
COMMENT ON COLUMN public.metric_mappings.unified_metric_name IS 'Унифицированное название метрики (например, "Heart Rate")';
COMMENT ON COLUMN public.metric_mappings.device_mappings IS 'JSON объект с маппингом: {"whoop": "Heart Rate", "withings": "Heart Rate", "garmin": "Avg Heart Rate"}';
COMMENT ON COLUMN public.metric_mappings.aggregation_method IS 'Метод агрегации: average, max, min, most_recent, sum';
COMMENT ON COLUMN public.metric_mappings.priority_order IS 'Порядок приоритета источников: ["whoop", "garmin", "withings", "ultrahuman"]';

-- Включаем RLS
ALTER TABLE public.metric_mappings ENABLE ROW LEVEL SECURITY;

-- Политики RLS (все пользователи могут читать маппинги)
CREATE POLICY "Everyone can view metric mappings"
  ON public.metric_mappings
  FOR SELECT
  TO authenticated
  USING (true);

-- Только админы могут изменять маппинги
CREATE POLICY "Only admins can manage metric mappings"
  ON public.metric_mappings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Триггер для обновления updated_at
CREATE TRIGGER update_metric_mappings_updated_at
  BEFORE UPDATE ON public.metric_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Вставляем базовые маппинги для наших метрик
INSERT INTO public.metric_mappings (unified_metric_name, unified_metric_category, unified_unit, aggregation_method, device_mappings, priority_order) VALUES
  ('Recovery Score', 'recovery', '%', 'most_recent', 
   '{"whoop": ["Recovery Score", "Recovery"], "ultrahuman": ["Recovery Score"]}', 
   ARRAY['whoop', 'ultrahuman']),
  
  ('Sleep Performance', 'sleep', '%', 'most_recent', 
   '{"whoop": ["Sleep Performance", "Sleep Score"], "ultrahuman": ["Sleep Score"], "garmin": ["Sleep Quality"]}', 
   ARRAY['whoop', 'garmin', 'ultrahuman']),
  
  ('Heart Rate', 'cardio', 'bpm', 'average', 
   '{"whoop": ["Heart Rate", "Resting Heart Rate"], "withings": ["Heart Rate"], "garmin": ["Avg Heart Rate", "Resting Heart Rate"], "ultrahuman": ["Heart Rate"]}', 
   ARRAY['whoop', 'garmin', 'withings', 'ultrahuman']),
  
  ('Heart Rate Variability', 'recovery', 'ms', 'average', 
   '{"whoop": ["Heart Rate Variability", "HRV"], "garmin": ["HRV"], "ultrahuman": ["HRV"]}', 
   ARRAY['whoop', 'garmin', 'ultrahuman']),
  
  ('Weight', 'body', 'kg', 'most_recent', 
   '{"withings": ["Weight", "Body Mass"], "garmin": ["Weight", "Body Weight"], "ultrahuman": ["Weight"], "apple_health": ["HKQuantityTypeIdentifierBodyMass", "Body Mass"]}', 
   ARRAY['withings', 'garmin', 'ultrahuman', 'apple_health']),
  
  ('Body Fat Percentage', 'body', '%', 'most_recent', 
   '{"withings": ["Body Fat Percentage", "Fat Mass"], "garmin": ["Body Fat %"], "ultrahuman": ["Body Fat"]}', 
   ARRAY['withings', 'garmin', 'ultrahuman']),
  
  ('VO2Max', 'cardio', 'ml/kg/min', 'max', 
   '{"garmin": ["VO2Max"], "apple_health": ["HKQuantityTypeIdentifierVO2Max", "VO2 Max"], "whoop": ["VO2Max Estimate"]}', 
   ARRAY['garmin', 'apple_health', 'whoop']),
  
  ('Steps', 'activity', 'steps', 'sum', 
   '{"garmin": ["Steps", "Step Count"], "withings": ["Steps"], "ultrahuman": ["Steps"], "apple_health": ["HKQuantityTypeIdentifierStepCount", "Steps"]}', 
   ARRAY['garmin', 'withings', 'ultrahuman', 'apple_health']),
  
  ('Active Calories', 'activity', 'kcal', 'sum', 
   '{"whoop": ["Active Calories", "Calories Burned"], "garmin": ["Active Calories"], "ultrahuman": ["Calories Burned"], "apple_health": ["Active Energy Burned"]}', 
   ARRAY['whoop', 'garmin', 'ultrahuman', 'apple_health']),
  
  ('Sleep Duration', 'sleep', 'hours', 'most_recent', 
   '{"whoop": ["Sleep Duration", "Total Sleep"], "garmin": ["Sleep Time"], "withings": ["Sleep Duration"], "ultrahuman": ["Sleep Hours"]}', 
   ARRAY['whoop', 'garmin', 'withings', 'ultrahuman']),
  
  ('Respiratory Rate', 'health', 'breaths/min', 'average', 
   '{"whoop": ["Respiratory Rate"], "garmin": ["Respiration Rate"], "withings": ["Respiratory Rate"]}', 
   ARRAY['whoop', 'garmin', 'withings']),
  
  ('SpO2', 'health', '%', 'average', 
   '{"garmin": ["Blood Oxygen", "SpO2"], "withings": ["SpO2"], "ultrahuman": ["Blood Oxygen"]}', 
   ARRAY['garmin', 'withings', 'ultrahuman']);

-- Создаем функцию для получения unified метрик
CREATE OR REPLACE FUNCTION public.get_unified_metrics(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_unified_metric_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  unified_metric_name TEXT,
  unified_category TEXT,
  unified_unit TEXT,
  aggregated_value NUMERIC,
  measurement_date DATE,
  source_count INTEGER,
  sources TEXT[],
  source_values JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH metric_data AS (
    SELECT 
      mm.unified_metric_name,
      mm.unified_metric_category,
      mm.unified_unit,
      mm.aggregation_method,
      mv.value,
      mv.measurement_date,
      um.source,
      um.metric_name
    FROM public.metric_mappings mm
    CROSS JOIN LATERAL jsonb_each_text(mm.device_mappings) AS device_mapping(source_key, metric_names_json)
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE 
        WHEN jsonb_typeof(metric_names_json::jsonb) = 'array' THEN metric_names_json::jsonb
        ELSE jsonb_build_array(metric_names_json)
      END
    ) AS metric_name_text
    JOIN public.user_metrics um ON 
      um.user_id = p_user_id AND
      um.source = device_mapping.source_key AND
      um.metric_name = metric_name_text
    JOIN public.metric_values mv ON 
      mv.metric_id = um.id AND
      mv.user_id = p_user_id
    WHERE mm.is_active = true
      AND (p_start_date IS NULL OR mv.measurement_date >= p_start_date)
      AND (p_end_date IS NULL OR mv.measurement_date <= p_end_date)
      AND (p_unified_metric_name IS NULL OR mm.unified_metric_name = p_unified_metric_name)
  )
  SELECT 
    md.unified_metric_name,
    md.unified_metric_category,
    md.unified_unit,
    CASE md.aggregation_method
      WHEN 'average' THEN AVG(md.value)
      WHEN 'max' THEN MAX(md.value)
      WHEN 'min' THEN MIN(md.value)
      WHEN 'sum' THEN SUM(md.value)
      WHEN 'most_recent' THEN (
        SELECT value FROM metric_data md2 
        WHERE md2.unified_metric_name = md.unified_metric_name 
          AND md2.measurement_date = md.measurement_date
        ORDER BY md2.value DESC 
        LIMIT 1
      )
      ELSE AVG(md.value)
    END as aggregated_value,
    md.measurement_date,
    COUNT(DISTINCT md.source)::INTEGER as source_count,
    array_agg(DISTINCT md.source) as sources,
    jsonb_object_agg(md.source, md.value) as source_values
  FROM metric_data md
  GROUP BY md.unified_metric_name, md.unified_metric_category, md.unified_unit, md.aggregation_method, md.measurement_date;
END;
$$;

-- Комментарий для функции
COMMENT ON FUNCTION public.get_unified_metrics IS 'Получает агрегированные данные метрик со всех источников пользователя';
