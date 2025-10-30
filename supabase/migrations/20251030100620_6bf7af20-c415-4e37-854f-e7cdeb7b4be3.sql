-- Create web_vitals_logs table for performance monitoring
CREATE TABLE IF NOT EXISTS web_vitals_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  rating TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by metric and date
CREATE INDEX IF NOT EXISTS idx_web_vitals_logs_metric_date 
  ON web_vitals_logs(metric_name, created_at DESC);

-- Create index for URL-based queries
CREATE INDEX IF NOT EXISTS idx_web_vitals_logs_url 
  ON web_vitals_logs(url, created_at DESC);

-- Enable RLS (but allow all inserts since this is from edge function)
ALTER TABLE web_vitals_logs ENABLE ROW LEVEL SECURITY;

-- Allow edge function to insert vitals (public access for analytics)
CREATE POLICY "Allow public insert for web vitals"
  ON web_vitals_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow admins to view web vitals
CREATE POLICY "Admins can view web vitals"
  ON web_vitals_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );