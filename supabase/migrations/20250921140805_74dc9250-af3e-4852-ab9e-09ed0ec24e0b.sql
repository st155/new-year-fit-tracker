-- Полностью удаляем все политики challenge_participants и создаем заново без рекурсии

DROP POLICY IF EXISTS "Users can view challenge participants" ON challenge_participants;
DROP POLICY IF EXISTS "Users can view own participations" ON challenge_participants;
DROP POLICY IF EXISTS "Users can join challenges" ON challenge_participants;
DROP POLICY IF EXISTS "Users can view participants" ON challenge_participants;
DROP POLICY IF EXISTS "Users can view their own participations" ON challenge_participants;

-- Создаем простые политики без рекурсии
CREATE POLICY "Users can view their participations"
ON challenge_participants
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can join challenges" 
ON challenge_participants
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Также исправляем политики для goals чтобы избежать связи с challenge_participants
DROP POLICY IF EXISTS "Users can view goals" ON goals;
DROP POLICY IF EXISTS "Users can create personal goals" ON goals;

-- Упрощенные политики для goals 
CREATE POLICY "Users can view their personal goals"
ON goals  
FOR SELECT
USING (user_id = auth.uid() AND is_personal = true);

CREATE POLICY "Users can view challenge goals"
ON goals
FOR SELECT  
USING (is_personal = false);

CREATE POLICY "Users can create goals"
ON goals
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Исправляем политики для measurements
DROP POLICY IF EXISTS "Users can view measurements" ON measurements;

CREATE POLICY "Users can view their measurements"
ON measurements
FOR SELECT
USING (user_id = auth.uid());