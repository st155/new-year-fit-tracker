-- Create trainer_reports table for storing generated report metadata
CREATE TABLE trainer_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('custom', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_config JSONB DEFAULT '{}'::jsonb,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata for search
  client_name TEXT,
  goals_count INTEGER DEFAULT 0,
  metrics_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_trainer_reports_trainer ON trainer_reports(trainer_id, created_at DESC);
CREATE INDEX idx_trainer_reports_client ON trainer_reports(client_id, created_at DESC);

-- Enable RLS
ALTER TABLE trainer_reports ENABLE ROW LEVEL SECURITY;

-- Trainers can view their reports and clients can view their own reports
CREATE POLICY "Trainers can view their reports"
  ON trainer_reports
  FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
  );

-- Trainers can create reports
CREATE POLICY "Trainers can create reports"
  ON trainer_reports
  FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

-- Trainers can delete their reports
CREATE POLICY "Trainers can delete their reports"
  ON trainer_reports
  FOR DELETE
  USING (trainer_id = auth.uid());