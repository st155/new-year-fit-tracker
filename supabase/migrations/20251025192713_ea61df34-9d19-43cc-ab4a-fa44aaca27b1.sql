-- Create user_achievements table for tracking unlocked achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage achievements"
  ON public.user_achievements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Challenge participants can view each other's achievements
CREATE POLICY "Challenge participants can view achievements"
  ON public.user_achievements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenge_participants cp1
      JOIN challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
      WHERE cp1.user_id = auth.uid() AND cp2.user_id = user_achievements.user_id
    )
  );

-- Create index for performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON public.user_achievements(unlocked_at DESC);