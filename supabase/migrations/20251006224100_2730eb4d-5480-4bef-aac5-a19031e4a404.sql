-- Создаем security definer функцию для проверки участия в челлендже
-- Это предотвратит infinite recursion в RLS политике
CREATE OR REPLACE FUNCTION public.is_challenge_participant(_user_id uuid, _challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.challenge_participants
    WHERE user_id = _user_id
    AND challenge_id = _challenge_id
  )
$$;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Participants can view challenge participants" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can view their participations" ON public.challenge_participants;

-- Создаем новую безопасную политику используя security definer функцию
CREATE POLICY "Participants can view challenge participants"
ON public.challenge_participants
FOR SELECT
USING (
  public.is_challenge_participant(auth.uid(), challenge_id)
);

-- Политика для присоединения к челленджу
CREATE POLICY "Users can join challenges"
ON public.challenge_participants
FOR INSERT
WITH CHECK (user_id = auth.uid());