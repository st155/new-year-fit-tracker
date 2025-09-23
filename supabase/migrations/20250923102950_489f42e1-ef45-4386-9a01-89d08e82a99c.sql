-- Обновляем профиль пользователя, делая его тренером
UPDATE public.profiles 
SET trainer_role = true 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = '1@ddistrict.io'
);

-- Добавляем роль тренера в user_roles
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT 
  id,
  'trainer'::app_role,
  id
FROM auth.users 
WHERE email = '1@ddistrict.io'
ON CONFLICT (user_id, role) DO NOTHING;