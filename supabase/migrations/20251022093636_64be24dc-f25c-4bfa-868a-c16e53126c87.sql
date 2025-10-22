-- Отключение тренерского доступа для st@roosh.vc
-- User ID: a527db40-3f7f-448f-8782-da632711e818

-- Шаг 1: Отключить trainer_role в профиле
UPDATE public.profiles 
SET trainer_role = false 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818';

-- Шаг 2: Удалить роль trainer из user_roles
DELETE FROM public.user_roles 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818' 
  AND role = 'trainer';