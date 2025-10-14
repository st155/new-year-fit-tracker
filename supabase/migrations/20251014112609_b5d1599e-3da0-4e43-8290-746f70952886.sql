-- Создаем таблицу для хранения InBody анализов
CREATE TABLE IF NOT EXISTS inbody_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Core Vitals
  weight NUMERIC(5,1),
  skeletal_muscle_mass NUMERIC(5,1),
  percent_body_fat NUMERIC(4,1),
  
  -- Body Composition
  total_body_water NUMERIC(5,1),
  protein NUMERIC(4,2),
  minerals NUMERIC(4,2),
  body_fat_mass NUMERIC(5,1),
  
  -- Additional Metrics
  visceral_fat_area NUMERIC(5,1),
  bmi NUMERIC(4,1),
  bmr INTEGER,
  
  -- Segmental Analysis
  right_arm_mass NUMERIC(4,2),
  right_arm_percent NUMERIC(5,1),
  left_arm_mass NUMERIC(4,2),
  left_arm_percent NUMERIC(5,1),
  trunk_mass NUMERIC(5,1),
  trunk_percent NUMERIC(5,1),
  right_leg_mass NUMERIC(5,2),
  right_leg_percent NUMERIC(5,1),
  left_leg_mass NUMERIC(5,2),
  left_leg_percent NUMERIC(5,1),
  
  -- Metadata
  pdf_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inbody_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own analyses
CREATE POLICY "Users can view their own InBody analyses"
  ON inbody_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert their own InBody analyses"
  ON inbody_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "Users can update their own InBody analyses"
  ON inbody_analyses FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete their own InBody analyses"
  ON inbody_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_inbody_analyses_user_date ON inbody_analyses(user_id, test_date DESC);

-- Create storage bucket for InBody PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('inbody-pdfs', 'inbody-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for InBody PDFs
CREATE POLICY "Users can upload their own InBody PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inbody-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own InBody PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'inbody-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own InBody PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'inbody-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );