-- Fix goals table to allow NULL challenge_id for personal goals
ALTER TABLE public.goals 
ALTER COLUMN challenge_id DROP NOT NULL;

-- Add comment to clarify that challenge_id can be NULL for personal goals
COMMENT ON COLUMN public.goals.challenge_id IS 'Can be NULL for personal goals that are not part of a challenge';