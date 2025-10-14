-- Create dashboard_widgets table for customizable dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  source TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Users can view their own widgets
CREATE POLICY "Users can view their own widgets"
  ON public.dashboard_widgets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own widgets
CREATE POLICY "Users can insert their own widgets"
  ON public.dashboard_widgets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own widgets
CREATE POLICY "Users can update their own widgets"
  ON public.dashboard_widgets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own widgets
CREATE POLICY "Users can delete their own widgets"
  ON public.dashboard_widgets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_dashboard_widgets_user_id ON public.dashboard_widgets(user_id);
CREATE INDEX idx_dashboard_widgets_position ON public.dashboard_widgets(user_id, position);