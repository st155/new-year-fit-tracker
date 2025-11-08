-- Удаляем старую политику для тренеров
DROP POLICY IF EXISTS "Trainers can create challenges" ON public.challenges;

-- Создаем новую политику - любой аутентифицированный пользователь может создавать челленджи
CREATE POLICY "Authenticated users can create challenges"
ON public.challenges
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
