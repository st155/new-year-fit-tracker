
-- Удаляем старые политики просмотра целей
DROP POLICY IF EXISTS "Users can view challenge goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view their personal goals" ON public.goals;

-- Создаем новую объединенную политику: пользователи могут видеть свои цели (личные или челленджевые)
CREATE POLICY "Users can view their own goals"
ON public.goals
FOR SELECT
USING (auth.uid() = user_id);

-- Пользователи могут видеть публичные челленджевые цели
CREATE POLICY "Users can view public challenge goals"
ON public.goals
FOR SELECT
USING (is_personal = false);
