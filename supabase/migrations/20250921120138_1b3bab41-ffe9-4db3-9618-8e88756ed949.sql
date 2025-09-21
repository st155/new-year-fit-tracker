-- Исправляем проблему с рекурсией в RLS политиках для challenge_participants

-- Удаляем проблемную политику 
DROP POLICY IF EXISTS "Participants can view challenge members" ON challenge_participants;

-- Создаем простую политику без рекурсии
CREATE POLICY "Users can view their own participations"
ON challenge_participants FOR SELECT
USING (auth.uid() = user_id);

-- Создаем политику для просмотра других участников того же челленджа
CREATE POLICY "Users can view other participants in same challenge"
ON challenge_participants FOR SELECT
USING (
  challenge_id IN (
    SELECT challenge_id 
    FROM challenge_participants 
    WHERE user_id = auth.uid()
  )
);