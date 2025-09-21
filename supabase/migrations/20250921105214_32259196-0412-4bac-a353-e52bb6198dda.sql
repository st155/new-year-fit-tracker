-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  trainer_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge participants table
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Create goals table (both personal and challenge-wide goals)
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE, -- NULL for challenge-wide goals
  goal_type TEXT NOT NULL, -- 'body_fat', 'rowing_2km', 'run_1km', 'pullups', 'bench_press', etc.
  goal_name TEXT NOT NULL,
  target_value DECIMAL,
  target_unit TEXT, -- 'kg', 'cm', '%', 'reps', 'seconds', 'minutes'
  is_personal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create measurements table for tracking progress
CREATE TABLE public.measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  photo_url TEXT, -- for progress photos
  screenshot_url TEXT, -- for device screenshots
  verified_by_trainer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create body composition table for detailed tracking
CREATE TABLE public.body_composition (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight DECIMAL,
  body_fat_percentage DECIMAL,
  muscle_mass DECIMAL,
  measurement_method TEXT, -- 'InBody', 'caliper', 'bioimpedance'
  photo_before_url TEXT,
  photo_after_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_composition ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for challenges
CREATE POLICY "Everyone can view active challenges" 
ON public.challenges 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Trainers can create challenges" 
ON public.challenges 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND trainer_role = true
  )
);

CREATE POLICY "Challenge creators can update their challenges" 
ON public.challenges 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Create RLS policies for challenge participants
CREATE POLICY "Participants can view challenge members" 
ON public.challenge_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants cp 
    WHERE cp.challenge_id = challenge_participants.challenge_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join challenges" 
ON public.challenge_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for goals
CREATE POLICY "Challenge participants can view goals" 
ON public.goals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants cp 
    WHERE cp.challenge_id = goals.challenge_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create personal goals" 
ON public.goals 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND is_personal = true
  OR (
    user_id IS NULL AND is_personal = false AND
    EXISTS (
      SELECT 1 FROM public.challenges c 
      WHERE c.id = challenge_id AND c.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own goals" 
ON public.goals 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for measurements
CREATE POLICY "Users can view their own measurements" 
ON public.measurements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Challenge participants can view other measurements" 
ON public.measurements 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants cp 
    JOIN public.goals g ON g.challenge_id = cp.challenge_id
    WHERE cp.user_id = auth.uid() 
    AND g.id = measurements.goal_id
  )
);

CREATE POLICY "Users can insert their own measurements" 
ON public.measurements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own measurements" 
ON public.measurements 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for body composition
CREATE POLICY "Users can view their own body composition" 
ON public.body_composition 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Challenge participants can view other body composition" 
ON public.body_composition 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants cp1
    JOIN public.challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = body_composition.user_id
  )
);

CREATE POLICY "Users can insert their own body composition" 
ON public.body_composition 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body composition" 
ON public.body_composition 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();