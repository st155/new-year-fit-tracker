-- Создаем Антона как тренера
-- Сначала найдем пользователя Антон по email или создадим запись
-- Предполагаем что у вас есть пользователь с именем Антон или похожим

-- Добавляем роль тренера для пользователей с trainer_role = true
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT 
  user_id, 
  'trainer'::app_role,
  user_id -- сам себе назначает роль
FROM public.profiles 
WHERE trainer_role = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Создаем связи тренер-клиент для всех участников челленджей
-- где тренером является пользователь с trainer_role = true
INSERT INTO public.trainer_clients (trainer_id, client_id)
SELECT DISTINCT
  trainer.user_id as trainer_id,
  participant.user_id as client_id
FROM public.profiles trainer
CROSS JOIN public.profiles participant
WHERE trainer.trainer_role = true 
  AND participant.trainer_role = false
  AND trainer.user_id != participant.user_id
ON CONFLICT (trainer_id, client_id) DO NOTHING;