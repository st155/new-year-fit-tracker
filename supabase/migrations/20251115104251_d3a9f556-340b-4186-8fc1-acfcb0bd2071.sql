-- Исправление дублирующихся политик на unified_metrics
-- Удаляем старую политику с ролью public, оставляем только authenticated

-- Удалить дублирующую SELECT политику
DROP POLICY IF EXISTS "Users can view own metrics" ON unified_metrics;

-- Проверяем, что основная политика существует (она уже должна быть)
-- "Users can view their own metrics" для роли authenticated уже существует

-- Также проверим другие таблицы, которые могут иметь проблемы
-- Убедимся, что dashboard_widgets имеет правильные политики

-- Если политики нет, создадим ее
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dashboard_widgets' 
    AND policyname = 'Users can view their own widgets'
  ) THEN
    CREATE POLICY "Users can view their own widgets"
      ON dashboard_widgets
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;