-- Fix inconsistency in goals table where personal goals show as Challenge Goal
UPDATE public.goals 
SET challenge_id = NULL 
WHERE is_personal = true AND challenge_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.goals.is_personal IS 'When true, challenge_id should be NULL (personal goal). When false, challenge_id should reference a challenge.';