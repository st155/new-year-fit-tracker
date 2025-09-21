-- Удаляем проблемные политики для challenge_participants
DROP POLICY IF EXISTS "Users can view other participants in same challenge" ON public.challenge_participants;

-- Создаем новую политику без рекурсии
CREATE POLICY "Users can view participants" 
ON public.challenge_participants 
FOR SELECT 
USING (
  -- Пользователи могут видеть свои участия
  auth.uid() = user_id 
  OR 
  -- Пользователи могут видеть других участников в своих челленджах
  EXISTS (
    SELECT 1 
    FROM public.challenge_participants cp_user 
    WHERE cp_user.user_id = auth.uid() 
    AND cp_user.challenge_id = challenge_participants.challenge_id
  )
);

-- Также исправим политики для goals, которые могут ссылаться на challenge_participants
DROP POLICY IF EXISTS "Challenge participants can view goals" ON public.goals;

CREATE POLICY "Users can view goals" 
ON public.goals 
FOR SELECT 
USING (
  -- Личные цели пользователя
  (auth.uid() = user_id AND is_personal = true)
  OR
  -- Цели челленджей, в которых участвует пользователь
  (is_personal = false AND EXISTS (
    SELECT 1 
    FROM public.challenge_participants cp 
    WHERE cp.challenge_id = goals.challenge_id 
    AND cp.user_id = auth.uid()
  ))
);

-- Исправим политики для measurements
DROP POLICY IF EXISTS "Challenge participants can view other measurements" ON public.measurements;

CREATE POLICY "Users can view measurements" 
ON public.measurements 
FOR SELECT 
USING (
  -- Собственные измерения
  auth.uid() = user_id 
  OR 
  -- Измерения по целям челленджей, в которых участвует пользователь
  EXISTS (
    SELECT 1 
    FROM public.goals g
    JOIN public.challenge_participants cp ON g.challenge_id = cp.challenge_id
    WHERE g.id = measurements.goal_id 
    AND cp.user_id = auth.uid()
    AND g.is_personal = false
  )
);

-- Исправим политики для body_composition
DROP POLICY IF EXISTS "Challenge participants can view other body composition" ON public.body_composition;

CREATE POLICY "Users can view body composition" 
ON public.body_composition 
FOR SELECT 
USING (
  -- Собственные данные
  auth.uid() = user_id 
  OR 
  -- Данные участников в общих челленджах
  EXISTS (
    SELECT 1 
    FROM public.challenge_participants cp1
    JOIN public.challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = body_composition.user_id
  )
);