-- Create recommendations_history table for persistent storage
CREATE TABLE IF NOT EXISTS recommendations_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendations_text TEXT NOT NULL,
  context_snapshot JSONB,  -- {documents_analyzed, biomarkers_count, etc}
  health_score NUMERIC,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE recommendations_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recommendations history"
  ON recommendations_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations history"
  ON recommendations_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_recommendations_history_user_id ON recommendations_history(user_id);
CREATE INDEX idx_recommendations_history_generated_at ON recommendations_history(user_id, generated_at DESC);