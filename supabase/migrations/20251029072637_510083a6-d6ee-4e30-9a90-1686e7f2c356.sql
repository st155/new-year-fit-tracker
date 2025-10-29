-- Create trainer_schedule_events table
CREATE TABLE IF NOT EXISTS public.trainer_schedule_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  training_plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('workout', 'consultation', 'reminder', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  reminder_minutes INTEGER DEFAULT 30,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_trainer_schedule_events_trainer_id ON public.trainer_schedule_events(trainer_id);
CREATE INDEX idx_trainer_schedule_events_client_id ON public.trainer_schedule_events(client_id);
CREATE INDEX idx_trainer_schedule_events_start_time ON public.trainer_schedule_events(start_time);
CREATE INDEX idx_trainer_schedule_events_training_plan_id ON public.trainer_schedule_events(training_plan_id);

-- Enable RLS
ALTER TABLE public.trainer_schedule_events ENABLE ROW LEVEL SECURITY;

-- Trainers can view their own events
CREATE POLICY "Trainers can view their own schedule events"
ON public.trainer_schedule_events
FOR SELECT
USING (auth.uid() = trainer_id);

-- Trainers can create their own events
CREATE POLICY "Trainers can create their own schedule events"
ON public.trainer_schedule_events
FOR INSERT
WITH CHECK (auth.uid() = trainer_id);

-- Trainers can update their own events
CREATE POLICY "Trainers can update their own schedule events"
ON public.trainer_schedule_events
FOR UPDATE
USING (auth.uid() = trainer_id);

-- Trainers can delete their own events
CREATE POLICY "Trainers can delete their own schedule events"
ON public.trainer_schedule_events
FOR DELETE
USING (auth.uid() = trainer_id);

-- Clients can view events assigned to them
CREATE POLICY "Clients can view their assigned events"
ON public.trainer_schedule_events
FOR SELECT
USING (auth.uid() = client_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_schedule_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_schedule_events_updated_at
BEFORE UPDATE ON public.trainer_schedule_events
FOR EACH ROW
EXECUTE FUNCTION public.update_schedule_events_updated_at();