-- ============================================
-- Analytics Enhancements Migration
-- Creates xp_history table and habit_analytics view
-- ============================================

-- Create XP History table
CREATE TABLE IF NOT EXISTS public.xp_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  xp_earned INTEGER NOT NULL DEFAULT 10,
  reason TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_xp_history_user_date 
  ON public.xp_history(user_id, earned_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_xp_history_habit 
  ON public.xp_history(habit_id, earned_at DESC);

-- Enable RLS
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own XP history"
  ON public.xp_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP history"
  ON public.xp_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create habit_analytics view for comprehensive stats
CREATE OR REPLACE VIEW public.habit_analytics AS
SELECT 
  h.id,
  h.user_id,
  h.name,
  h.category,
  h.time_of_day,
  h.icon,
  h.color,
  hs.current_streak,
  hs.longest_streak,
  hs.total_completions,
  hs.completion_rate,
  hs.last_completed_at,
  COUNT(DISTINCT DATE(hc.completed_at)) as days_completed,
  COALESCE(AVG(EXTRACT(HOUR FROM hc.completed_at)), 12) as avg_completion_hour,
  COALESCE(SUM(CASE WHEN DATE(hc.completed_at) >= CURRENT_DATE - INTERVAL '7 days' 
    THEN 1 ELSE 0 END), 0) as completions_last_7_days,
  COALESCE(SUM(CASE WHEN DATE(hc.completed_at) >= CURRENT_DATE - INTERVAL '30 days' 
    THEN 1 ELSE 0 END), 0) as completions_last_30_days
FROM public.habits h
LEFT JOIN public.habit_stats hs ON h.id = hs.habit_id
LEFT JOIN public.habit_completions hc ON h.id = hc.habit_id 
  AND hc.user_id = h.user_id
WHERE h.is_active = true
GROUP BY 
  h.id, h.user_id, h.name, h.category, h.time_of_day, 
  h.icon, h.color, hs.current_streak, hs.longest_streak, 
  hs.total_completions, hs.completion_rate, hs.last_completed_at;

-- Grant permissions
GRANT SELECT ON public.habit_analytics TO authenticated;

-- Function to automatically log XP when habit is completed
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-log XP
DROP TRIGGER IF EXISTS trigger_log_xp_on_completion ON public.habit_completions;
CREATE TRIGGER trigger_log_xp_on_completion
  AFTER INSERT ON public.habit_completions
  FOR EACH ROW
  EXECUTE FUNCTION log_xp_on_completion();

-- Comments
COMMENT ON TABLE public.xp_history IS 'Tracks XP earned from habit completions and other activities';
COMMENT ON VIEW public.habit_analytics IS 'Comprehensive analytics view combining habits, stats, and completion data';