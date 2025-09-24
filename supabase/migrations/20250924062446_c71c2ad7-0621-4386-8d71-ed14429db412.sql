-- Добавляем тренерскую роль пользователю Антону
INSERT INTO public.user_roles (user_id, role)
VALUES ('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'trainer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Обновляем профиль пользователя, добавляя флаг тренера
UPDATE public.profiles 
SET trainer_role = true 
WHERE user_id = 'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e';