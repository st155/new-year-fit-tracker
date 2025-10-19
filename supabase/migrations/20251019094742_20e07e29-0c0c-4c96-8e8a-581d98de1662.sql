-- Добавляем RLS политику для предотвращения самоназначения тренера клиентом
CREATE POLICY "Prevent trainer self-assignment"
ON public.trainer_clients
FOR INSERT
TO authenticated
WITH CHECK (trainer_id != client_id);