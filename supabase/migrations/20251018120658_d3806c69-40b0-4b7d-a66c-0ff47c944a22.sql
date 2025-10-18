-- Fix infinite recursion in RLS policies by using security definer functions

-- Update challenges policies
DROP POLICY IF EXISTS "Trainers can view their challenges v2" ON public.challenges;
DROP POLICY IF EXISTS "Trainers can update their challenges" ON public.challenges;

CREATE POLICY "Trainers can view their challenges v3"
ON public.challenges
FOR SELECT
USING (
  created_by = auth.uid() 
  OR is_active = true
  OR is_challenge_trainer(auth.uid(), id)
);

CREATE POLICY "Trainers can update their challenges v2"
ON public.challenges
FOR UPDATE
USING (is_challenge_trainer(auth.uid(), id));

-- Update challenge_trainers policies
DROP POLICY IF EXISTS "Challenge owners can manage trainers v2" ON public.challenge_trainers;

CREATE POLICY "Challenge owners can manage trainers v3"
ON public.challenge_trainers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.challenges 
    WHERE id = challenge_trainers.challenge_id 
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.challenges 
    WHERE id = challenge_trainers.challenge_id 
    AND created_by = auth.uid()
  )
);

-- Update challenge_participants policies
DROP POLICY IF EXISTS "Trainers can remove participants" ON public.challenge_participants;
DROP POLICY IF EXISTS "Participants can view challenge participants" ON public.challenge_participants;

CREATE POLICY "Trainers can remove participants v2"
ON public.challenge_participants
FOR DELETE
USING (is_challenge_trainer(auth.uid(), challenge_id));

CREATE POLICY "Participants can view challenge participants v2"
ON public.challenge_participants
FOR SELECT
USING (is_challenge_participant(auth.uid(), challenge_id));