-- Добавить роль тренера для пользователя 1@ddistrict.io
INSERT INTO public.user_roles (user_id, role)
VALUES ('6169f2b0-d265-4ef5-a678-80d6e6b95ae1', 'trainer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Также обновить trainer_role в profiles для совместимости
UPDATE public.profiles
SET trainer_role = true
WHERE user_id = '6169f2b0-d265-4ef5-a678-80d6e6b95ae1';