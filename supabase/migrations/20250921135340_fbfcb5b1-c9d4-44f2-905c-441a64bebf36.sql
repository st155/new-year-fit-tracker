-- Исправляем RLS политики для challenge_participants чтобы убрать бесконечную рекурсию

-- Удаляем проблемные политики
DROP POLICY IF EXISTS "Users can view participants" ON challenge_participants;
DROP POLICY IF EXISTS "Users can view their own participations" ON challenge_participants;

-- Создаем исправленные политики без рекурсии
CREATE POLICY "Users can view challenge participants"
ON challenge_participants
FOR SELECT
USING (
  -- Пользователь может видеть участников челленджей, в которых он сам участвует
  challenge_id IN (
    SELECT challenge_id 
    FROM challenge_participants cp 
    WHERE cp.user_id = auth.uid()
  )
  OR
  -- Пользователь может видеть свои собственные участия
  user_id = auth.uid()
);

-- Простая политика для собственных участий  
CREATE POLICY "Users can view own participations"
ON challenge_participants
FOR SELECT
USING (user_id = auth.uid());