-- Удаляем дублирующийся триггер на таблице measurements
-- Оставляем только один триггер для создания записей в activity_feed
DROP TRIGGER IF EXISTS create_activity_feed_entry_on_measurement ON public.measurements;

-- Проверяем, что остался основной триггер
-- (create_measurement_activity должен остаться)