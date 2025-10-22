-- Исправление security warning для функции normalize_user_metrics_fields
-- Сначала удаляем триггер, потом функцию, потом пересоздаём всё

DROP TRIGGER IF EXISTS trg_normalize_user_metrics ON user_metrics;
DROP FUNCTION IF EXISTS normalize_user_metrics_fields();

-- Пересоздаём функцию с правильным search_path
CREATE OR REPLACE FUNCTION normalize_user_metrics_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Приводим source к нижнему регистру
  NEW.source := LOWER(NEW.source);
  
  -- Убираем пробелы в начале и конце metric_name
  NEW.metric_name := TRIM(NEW.metric_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public';

-- Пересоздаём триггер
CREATE TRIGGER trg_normalize_user_metrics
  BEFORE INSERT OR UPDATE ON user_metrics
  FOR EACH ROW
  EXECUTE FUNCTION normalize_user_metrics_fields();

COMMENT ON FUNCTION normalize_user_metrics_fields() IS 'Автоматически нормализует поля source (в lowercase) и metric_name (trim) в таблице user_metrics';