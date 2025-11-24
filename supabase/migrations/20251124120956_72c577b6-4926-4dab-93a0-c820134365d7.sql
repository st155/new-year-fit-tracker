-- Массовая миграция: Исправление search_path в 46 функциях
-- Заменяем SET search_path TO 'public', 'pg_temp' -> SET search_path = 'public'
-- Это повышает безопасность и соответствует Supabase best practices

DO $$
DECLARE
  func_record RECORD;
  new_definition TEXT;
  updated_count INTEGER := 0;
BEGIN
  -- Находим все функции с проблемным search_path
  FOR func_record IN
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'  -- только функции, не процедуры
      AND pg_get_functiondef(p.oid) ILIKE '%SET search_path TO ''public'', ''pg_temp''%'
  LOOP
    BEGIN
      -- Заменяем проблемный search_path на безопасный
      new_definition := REGEXP_REPLACE(
        func_record.definition,
        'SET search_path TO ''public'', ''pg_temp''',
        'SET search_path = ''public''',
        'gi'
      );
      
      -- Пересоздаём функцию с новым определением
      EXECUTE new_definition;
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated function: % (% of ~46)', func_record.function_name, updated_count;
      
    EXCEPTION WHEN OTHERS THEN
      -- Логируем ошибку, но продолжаем обработку
      RAISE WARNING 'Failed to update function %: %', func_record.function_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Migration complete: % functions updated', updated_count;
END $$;