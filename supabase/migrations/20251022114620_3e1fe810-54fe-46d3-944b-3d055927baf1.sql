-- Нормализация данных в user_metrics для предотвращения проблем с регистром

-- 1. Разовая нормализация существующих данных
UPDATE user_metrics 
SET source = LOWER(source);

UPDATE user_metrics 
SET metric_name = TRIM(metric_name);

-- 2. Создание функции для автоматической нормализации
CREATE OR REPLACE FUNCTION normalize_user_metrics_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Приводим source к нижнему регистру
  NEW.source := LOWER(NEW.source);
  
  -- Убираем пробелы в начале и конце metric_name
  NEW.metric_name := TRIM(NEW.metric_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Создание триггера для автоматической нормализации при INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_normalize_user_metrics ON user_metrics;

CREATE TRIGGER trg_normalize_user_metrics
  BEFORE INSERT OR UPDATE ON user_metrics
  FOR EACH ROW
  EXECUTE FUNCTION normalize_user_metrics_fields();

-- 4. Комментарии для документации
COMMENT ON FUNCTION normalize_user_metrics_fields() IS 'Автоматически нормализует поля source (в lowercase) и metric_name (trim) в таблице user_metrics';
COMMENT ON TRIGGER trg_normalize_user_metrics ON user_metrics IS 'Обеспечивает консистентность данных путем нормализации source и metric_name перед записью';