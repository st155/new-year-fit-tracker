-- Create health_analyses table for storing AI-generated health reports
CREATE TABLE IF NOT EXISTS health_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Scores & Metrics
  overall_score NUMERIC(3,1) CHECK (overall_score >= 0 AND overall_score <= 10),
  health_categories JSONB,
  
  -- Analysis Results
  summary TEXT NOT NULL,
  achievements TEXT[],
  concerns TEXT[],
  recommendations JSONB,
  
  -- Metadata
  documents_analyzed INTEGER DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  ai_model TEXT DEFAULT 'gemini-2.5-pro',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_health_analyses_user_date 
  ON health_analyses(user_id, analysis_date DESC);

-- Enable RLS
ALTER TABLE health_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own health analyses"
  ON health_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health analyses"
  ON health_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health analyses"
  ON health_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health analyses"
  ON health_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_health_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_health_analyses_updated_at
  BEFORE UPDATE ON health_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_health_analyses_updated_at();