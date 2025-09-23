-- Create activity_feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'workout', 'measurement', 'goal', 'body_composition'
  action_text TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_likes table
CREATE TABLE public.activity_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, user_id)
);

-- Create activity_comments table
CREATE TABLE public.activity_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_feed
CREATE POLICY "Users can view activity feed" ON public.activity_feed
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own activities" ON public.activity_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for activity_likes
CREATE POLICY "Users can view likes" ON public.activity_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like activities" ON public.activity_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike activities" ON public.activity_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for activity_comments
CREATE POLICY "Users can view comments" ON public.activity_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can comment on activities" ON public.activity_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.activity_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.activity_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Function to create activity feed entry
CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  action_text TEXT;
BEGIN
  -- Get user profile
  SELECT username, full_name INTO user_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Generate action text based on table
  IF TG_TABLE_NAME = 'workouts' THEN
    action_text := COALESCE(user_profile.full_name, user_profile.username) || 
                   ' завершил тренировку ' || NEW.workout_type;
    IF NEW.duration_minutes IS NOT NULL THEN
      action_text := action_text || ' (' || NEW.duration_minutes || ' мин)';
    END IF;
    IF NEW.calories_burned IS NOT NULL THEN
      action_text := action_text || ', сжег ' || NEW.calories_burned || ' ккал';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'measurements' THEN
    SELECT goal_name INTO action_text FROM public.goals WHERE id = NEW.goal_id;
    action_text := COALESCE(user_profile.full_name, user_profile.username) || 
                   ' записал измерение: ' || COALESCE(action_text, 'цель') || 
                   ' = ' || NEW.value || ' ' || NEW.unit;
                   
  ELSIF TG_TABLE_NAME = 'body_composition' THEN
    action_text := COALESCE(user_profile.full_name, user_profile.username) || 
                   ' обновил состав тела';
    IF NEW.weight IS NOT NULL THEN
      action_text := action_text || ' (вес: ' || NEW.weight || ' кг)';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'goals' THEN
    action_text := COALESCE(user_profile.full_name, user_profile.username) || 
                   ' создал новую цель: ' || NEW.goal_name;
    IF NEW.target_value IS NOT NULL THEN
      action_text := action_text || ' (' || NEW.target_value || 
                     COALESCE(' ' || NEW.target_unit, '') || ')';
    END IF;
  END IF;
  
  -- Insert into activity feed
  INSERT INTO public.activity_feed (
    user_id,
    action_type,
    action_text,
    source_table,
    source_id,
    metadata
  ) VALUES (
    NEW.user_id,
    TG_TABLE_NAME,
    action_text,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER activity_feed_workout_trigger
  AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();

CREATE TRIGGER activity_feed_measurement_trigger
  AFTER INSERT ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();

CREATE TRIGGER activity_feed_body_composition_trigger
  AFTER INSERT ON public.body_composition
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();

CREATE TRIGGER activity_feed_goal_trigger
  AFTER INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();

-- Add indexes for performance
CREATE INDEX idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX idx_activity_likes_activity_id ON public.activity_likes(activity_id);
CREATE INDEX idx_activity_comments_activity_id ON public.activity_comments(activity_id);