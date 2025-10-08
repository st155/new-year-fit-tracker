-- Create habits table
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  frequency TEXT NOT NULL DEFAULT 'daily',
  target_count INTEGER NOT NULL DEFAULT 7,
  icon TEXT,
  color TEXT,
  reminder_time TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit_completions table
CREATE TABLE public.habit_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit_stats table
CREATE TABLE public.habit_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC NOT NULL DEFAULT 0,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habits
CREATE POLICY "Users can view their own habits"
ON public.habits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habits"
ON public.habits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
ON public.habits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
ON public.habits FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for habit_completions
CREATE POLICY "Users can view their own habit completions"
ON public.habit_completions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit completions"
ON public.habit_completions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit completions"
ON public.habit_completions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit completions"
ON public.habit_completions FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for habit_stats
CREATE POLICY "Users can view their own habit stats"
ON public.habit_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit stats"
ON public.habit_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit stats"
ON public.habit_stats FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update habit stats
CREATE OR REPLACE FUNCTION public.update_habit_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_completions INTEGER;
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_completion_rate NUMERIC;
  v_habit_created_at TIMESTAMP WITH TIME ZONE;
  v_target_count INTEGER;
  v_days_since_creation INTEGER;
  prev_date DATE := NULL;
  streak_count INTEGER := 0;
  temp_streak INTEGER := 0;
  completion_record RECORD;
BEGIN
  -- Get habit details
  SELECT created_at, target_count INTO v_habit_created_at, v_target_count
  FROM public.habits
  WHERE id = NEW.habit_id;
  
  -- Calculate total completions
  SELECT COUNT(*) INTO v_total_completions
  FROM public.habit_completions
  WHERE habit_id = NEW.habit_id;
  
  -- Calculate streaks by checking consecutive days
  FOR completion_record IN
    SELECT DISTINCT DATE(completed_at) as completion_date
    FROM public.habit_completions
    WHERE habit_id = NEW.habit_id
    ORDER BY completion_date DESC
  LOOP
    IF prev_date IS NULL THEN
      -- First iteration
      streak_count := 1;
      temp_streak := 1;
      prev_date := completion_record.completion_date;
    ELSIF prev_date - completion_record.completion_date = 1 THEN
      -- Consecutive day
      streak_count := streak_count + 1;
      temp_streak := streak_count;
      prev_date := completion_record.completion_date;
    ELSE
      -- Streak broken
      IF v_current_streak = 0 THEN
        v_current_streak := temp_streak;
      END IF;
      IF temp_streak > v_longest_streak THEN
        v_longest_streak := temp_streak;
      END IF;
      streak_count := 1;
      temp_streak := 1;
      prev_date := completion_record.completion_date;
    END IF;
  END LOOP;
  
  -- Set current streak
  IF v_current_streak = 0 THEN
    v_current_streak := streak_count;
  END IF;
  
  -- Set longest streak
  IF streak_count > v_longest_streak THEN
    v_longest_streak := streak_count;
  END IF;
  
  -- Calculate completion rate
  v_days_since_creation := GREATEST(1, DATE_PART('day', NOW() - v_habit_created_at)::INTEGER);
  v_completion_rate := (v_total_completions::NUMERIC / v_days_since_creation) * 100;
  
  -- Upsert stats
  INSERT INTO public.habit_stats (
    habit_id,
    user_id,
    current_streak,
    longest_streak,
    total_completions,
    completion_rate,
    last_completed_at
  ) VALUES (
    NEW.habit_id,
    NEW.user_id,
    v_current_streak,
    v_longest_streak,
    v_total_completions,
    LEAST(100, v_completion_rate),
    NEW.completed_at
  )
  ON CONFLICT (habit_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    total_completions = EXCLUDED.total_completions,
    completion_rate = EXCLUDED.completion_rate,
    last_completed_at = EXCLUDED.last_completed_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger to update stats on new completion
CREATE TRIGGER update_habit_stats_on_completion
AFTER INSERT ON public.habit_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_habit_stats();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_habits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for habits updated_at
CREATE TRIGGER update_habits_updated_at
BEFORE UPDATE ON public.habits
FOR EACH ROW
EXECUTE FUNCTION public.update_habits_updated_at();