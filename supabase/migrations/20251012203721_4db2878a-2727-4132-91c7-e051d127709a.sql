-- Удаляем токены старой Whoop интеграции для текущего пользователя
DELETE FROM public.whoop_tokens 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818';

-- Активируем Terra Whoop токен
UPDATE public.terra_tokens 
SET is_active = true 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818' 
  AND provider = 'WHOOP';

-- Удаляем таблицы старой Whoop интеграции
DROP TABLE IF EXISTS public.whoop_oauth_states CASCADE;
DROP TABLE IF EXISTS public.whoop_tokens CASCADE;