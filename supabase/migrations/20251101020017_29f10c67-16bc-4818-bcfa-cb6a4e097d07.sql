-- Таблица для сессий интермиттентного голодания
CREATE TABLE IF NOT EXISTS fasting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  fasting_type TEXT NOT NULL, -- '16:8', '18:6', '20:4', '23:1', '36h-dry', '48h', 'custom'
  target_hours NUMERIC,
  completed BOOLEAN DEFAULT FALSE,
  interrupted_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для кастомизации виджетов привычек
CREATE TABLE IF NOT EXISTS user_habit_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  widget_type TEXT NOT NULL, -- 'fasting', 'water', 'sleep', 'supplements', etc.
  position INTEGER NOT NULL DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, widget_type)
);

-- Enable RLS
ALTER TABLE fasting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habit_widgets ENABLE ROW LEVEL SECURITY;

-- Policies for fasting_sessions
CREATE POLICY "Users can view their own fasting sessions"
  ON fasting_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fasting sessions"
  ON fasting_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fasting sessions"
  ON fasting_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fasting sessions"
  ON fasting_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for user_habit_widgets
CREATE POLICY "Users can view their own habit widgets"
  ON user_habit_widgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit widgets"
  ON user_habit_widgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit widgets"
  ON user_habit_widgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit widgets"
  ON user_habit_widgets FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fasting_sessions_user_id ON fasting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_fasting_sessions_start_time ON fasting_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_user_habit_widgets_user_id ON user_habit_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habit_widgets_position ON user_habit_widgets(user_id, position);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fasting_sessions_updated_at
  BEFORE UPDATE ON fasting_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_habit_widgets_updated_at
  BEFORE UPDATE ON user_habit_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();