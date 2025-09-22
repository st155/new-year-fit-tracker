-- Обновляем RLS политики для withings_oauth_states, чтобы Edge функции могли работать
DROP POLICY IF EXISTS "withings_oauth_states_insert_none" ON public.withings_oauth_states;
DROP POLICY IF EXISTS "withings_oauth_states_select_none" ON public.withings_oauth_states;
DROP POLICY IF EXISTS "withings_oauth_states_update_none" ON public.withings_oauth_states;
DROP POLICY IF EXISTS "withings_oauth_states_delete_none" ON public.withings_oauth_states;

-- Разрешаем Edge функциям управлять OAuth состояниями
CREATE POLICY "withings_oauth_states_service_role_all" 
ON public.withings_oauth_states 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Пользователи не должны иметь прямого доступа к OAuth состояниям
CREATE POLICY "withings_oauth_states_no_user_access" 
ON public.withings_oauth_states 
FOR ALL 
TO authenticated 
USING (false) 
WITH CHECK (false);