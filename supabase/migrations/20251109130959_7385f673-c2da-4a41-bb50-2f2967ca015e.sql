-- Fix security warning for log_xp_on_completion function
-- Add SET search_path to prevent search path mutable warning

CREATE OR REPLACE FUNCTION log_xp_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.xp_history (user_id, habit_id, xp_earned, reason, earned_at)
  VALUES (
    NEW.user_id,
    NEW.habit_id,
    10, -- Default XP per completion
    'Habit completion',
    NEW.completed_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;