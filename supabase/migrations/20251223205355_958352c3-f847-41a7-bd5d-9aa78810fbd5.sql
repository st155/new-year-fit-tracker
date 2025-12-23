-- Create table for storing exercise images
CREATE TABLE public.exercise_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_name)
);

-- Enable Row Level Security
ALTER TABLE public.exercise_images ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own exercise images" 
ON public.exercise_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercise images" 
ON public.exercise_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise images" 
ON public.exercise_images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise images" 
ON public.exercise_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_exercise_images_user_name ON public.exercise_images(user_id, exercise_name);