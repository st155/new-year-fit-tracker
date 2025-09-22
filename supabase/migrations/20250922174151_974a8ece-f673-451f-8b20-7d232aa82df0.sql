-- Удаляем пользователя hoho2014@gmail.com и все связанные данные
-- Сначала удаляем данные из публичных таблиц
DELETE FROM public.profiles WHERE user_id = 'a5f8fe52-8710-49bd-8d2e-d5fcb06c151e';
DELETE FROM public.user_roles WHERE user_id = 'a5f8fe52-8710-49bd-8d2e-d5fcb06c151e';

-- Удаляем пользователя из auth.users (это автоматически удалит связанные данные благодаря CASCADE)
DELETE FROM auth.users WHERE email = 'hoho2014@gmail.com';