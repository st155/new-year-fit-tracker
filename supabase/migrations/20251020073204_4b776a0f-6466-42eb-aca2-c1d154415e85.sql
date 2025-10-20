-- Создаем индекс для быстрой фильтрации измерений по пользователю и дате
CREATE INDEX IF NOT EXISTS idx_measurements_user_date 
ON measurements(user_id, measurement_date DESC);

-- Этот индекс оптимизирует:
-- 1. Запросы в materialized view trainer_client_summary для last_activity_date
-- 2. Фильтрацию активных клиентов (измерения за последние N дней)
-- 3. Сортировку измерений по дате в ClientDetailView