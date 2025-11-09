-- Phase 6: Social Features & Challenge Integration
-- Part 1: Habit-Based Challenges (corrected)

-- Таблица для связи привычек с челленджами
CREATE TABLE public.habit_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  goal_target INTEGER,
  goal_type TEXT DEFAULT 'streak',
  xp_multiplier DECIMAL DEFAULT 1.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, challenge_id)
);

-- Таблица для целей челленджей на основе привычек
CREATE TABLE public.habit_challenge_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  habit_template_id UUID REFERENCES public.habit_templates_community(id),
  goal_description TEXT NOT NULL,
  goal_metric TEXT NOT NULL,
  goal_target INTEGER NOT NULL,
  points_reward INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_habit_challenges_habit ON public.habit_challenges(habit_id);
CREATE INDEX idx_habit_challenges_challenge ON public.habit_challenges(challenge_id);
CREATE INDEX idx_habit_challenge_goals_challenge ON public.habit_challenge_goals(challenge_id);

-- RLS политики
ALTER TABLE public.habit_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_challenge_goals ENABLE ROW LEVEL SECURITY;

-- Участники челленджа могут просматривать связанные привычки
CREATE POLICY "Challenge participants can view habit challenges"
ON public.habit_challenges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants cp
    WHERE cp.challenge_id = habit_challenges.challenge_id
    AND cp.user_id = auth.uid()
  )
);

-- Пользователи могут связывать свои привычки с челленджами
CREATE POLICY "Users can link their habits to challenges"
ON public.habit_challenges FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = habit_challenges.habit_id
    AND h.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.challenge_participants cp
    WHERE cp.challenge_id = habit_challenges.challenge_id
    AND cp.user_id = auth.uid()
  )
);

-- Участники могут просматривать цели челленджа
CREATE POLICY "Challenge participants can view goals"
ON public.habit_challenge_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants cp
    WHERE cp.challenge_id = habit_challenge_goals.challenge_id
    AND cp.user_id = auth.uid()
  )
);

-- Создатели челленджа могут управлять целями
CREATE POLICY "Challenge creators can manage goals"
ON public.habit_challenge_goals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = habit_challenge_goals.challenge_id
    AND c.created_by = auth.uid()
  )
);