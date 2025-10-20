-- Добавляем поле source для отслеживания источника измерений
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Создаем индекс для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_measurements_source 
ON measurements(source);

-- Комментарий для документации
COMMENT ON COLUMN measurements.source IS 'Source of measurement: manual, whoop, withings, terra, etc.';