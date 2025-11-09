-- Add DELETE RLS policy for challenge_participants
-- Users can leave challenges by deleting their own participation record

CREATE POLICY "Users can leave challenges"
ON public.challenge_participants
FOR DELETE
USING (auth.uid() = user_id);