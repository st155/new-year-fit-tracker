-- Add linked_workout_id column to workouts table for linking WHOOP workouts with manual entries
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS linked_workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workouts_linked_workout_id ON public.workouts(linked_workout_id);