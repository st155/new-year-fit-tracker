-- Fix RLS policy for challenges to allow all authenticated users to view active challenges
DROP POLICY IF EXISTS "Users can view accessible challenges" ON public.challenges;

CREATE POLICY "Authenticated users can view active challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (
    -- All active challenges are visible to all authenticated users
    is_active = true
    OR
    -- Or user is creator/trainer/participant of inactive challenges
    created_by = auth.uid() 
    OR is_challenge_trainer(auth.uid(), id)
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenges.id
      AND cp.user_id = auth.uid()
    )
  );

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON public.challenges(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON public.challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON public.challenge_participants(user_id);