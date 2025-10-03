
-- Делаем st@roosh.vc тренером
UPDATE profiles 
SET trainer_role = true 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818';

-- Добавляем роль тренера
INSERT INTO user_roles (user_id, role)
VALUES ('a527db40-3f7f-448f-8782-da632711e818', 'trainer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Привязываем Aleksandar B как клиента к тренеру ST
INSERT INTO trainer_clients (trainer_id, client_id, active)
VALUES ('a527db40-3f7f-448f-8782-da632711e818', '4742da16-f8a4-4767-ae17-32a82146997e', true)
ON CONFLICT (trainer_id, client_id) DO UPDATE 
SET active = true, assigned_at = now();
