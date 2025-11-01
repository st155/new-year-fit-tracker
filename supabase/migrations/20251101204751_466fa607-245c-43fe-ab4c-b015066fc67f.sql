-- Drop the old restrictive policy that only showed user's own participation
DROP POLICY IF EXISTS "Participants can view challenge participants v2" ON public.challenge_participants;

-- Create new policy that allows users to see all participants of challenges they're part of
CREATE POLICY "Users can view participants of their challenges"
ON public.challenge_participants
FOR SELECT
TO authenticated
USING (
  -- Users can see all participants if:
  
  -- 1. They are a participant in the same challenge
  EXISTS (
    SELECT 1 
    FROM challenge_participants cp 
    WHERE cp.challenge_id = challenge_participants.challenge_id 
      AND cp.user_id = auth.uid()
  )
  
  OR
  
  -- 2. They are a trainer for this challenge
  is_challenge_trainer(auth.uid(), challenge_participants.challenge_id)
  
  OR
  
  -- 3. They created this challenge
  EXISTS (
    SELECT 1 
    FROM challenges c 
    WHERE c.id = challenge_participants.challenge_id 
      AND c.created_by = auth.uid()
  )
);