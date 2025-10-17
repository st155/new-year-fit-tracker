-- Fix RLS policies for challenges table to allow trainers to view their challenges
DROP POLICY IF EXISTS "Challenge creators can update their challenges" ON public.challenges;
DROP POLICY IF EXISTS "Everyone can view active challenges" ON public.challenges;
DROP POLICY IF EXISTS "Trainers can create challenges" ON public.challenges;

-- Trainers can view challenges they created or are assigned to
CREATE POLICY "Trainers can view their challenges"
ON public.challenges
FOR SELECT
USING (
  created_by = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.challenge_trainers 
    WHERE challenge_id = challenges.id AND trainer_id = auth.uid()
  )
  OR
  is_active = true
);

-- Trainers can create challenges
CREATE POLICY "Trainers can create challenges"
ON public.challenges
FOR INSERT
WITH CHECK (
  is_trainer(auth.uid())
);

-- Challenge creators and assigned trainers can update their challenges
CREATE POLICY "Trainers can update their challenges"
ON public.challenges
FOR UPDATE
USING (
  created_by = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.challenge_trainers 
    WHERE challenge_id = challenges.id AND trainer_id = auth.uid()
  )
);

-- Trainers can manage participants
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;

CREATE POLICY "Users can join challenges"
ON public.challenge_participants
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR 
  is_challenge_trainer(auth.uid(), challenge_id)
);

-- Trainers can remove participants
CREATE POLICY "Trainers can remove participants"
ON public.challenge_participants
FOR DELETE
USING (
  is_challenge_trainer(auth.uid(), challenge_id)
);