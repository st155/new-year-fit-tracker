-- Create biomarker_master table (master reference for biomarkers)
CREATE TABLE IF NOT EXISTS biomarker_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Canonical identification
  canonical_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  
  -- International standards
  loinc_code TEXT,
  category TEXT NOT NULL,
  
  -- Unit normalization
  standard_unit TEXT NOT NULL,
  alternative_units JSONB DEFAULT '[]'::jsonb,
  conversion_factors JSONB DEFAULT '{}'::jsonb,
  
  -- Reference ranges (age and gender-specific)
  reference_ranges JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Educational content
  description TEXT,
  interpretation_guide TEXT,
  clinical_significance TEXT,
  wiki_link TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create biomarker_aliases table (synonyms and alternative names)
CREATE TABLE IF NOT EXISTS biomarker_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biomarker_id UUID NOT NULL REFERENCES biomarker_master(id) ON DELETE CASCADE,
  
  alias TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  source TEXT,
  
  UNIQUE(alias, language),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lab_test_results table (actual test results)
CREATE TABLE IF NOT EXISTS lab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  
  -- Biomarker identification
  biomarker_id UUID REFERENCES biomarker_master(id),
  raw_test_name TEXT NOT NULL,
  
  -- Test values
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  normalized_value NUMERIC NOT NULL,
  normalized_unit TEXT NOT NULL,
  
  -- Lab metadata
  laboratory_name TEXT,
  laboratory_method TEXT,
  equipment_type TEXT,
  reagent_lot TEXT,
  
  -- Reference ranges (lab-specific)
  ref_range_min NUMERIC,
  ref_range_max NUMERIC,
  ref_range_unit TEXT,
  ref_range_source TEXT,
  
  -- Test timing
  test_date DATE NOT NULL,
  sample_type TEXT,
  
  -- Quality control
  is_outlier BOOLEAN DEFAULT FALSE,
  outlier_reason TEXT,
  quality_flag TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create laboratory_profiles table
CREATE TABLE IF NOT EXISTS laboratory_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lab_name TEXT NOT NULL UNIQUE,
  lab_country TEXT,
  lab_city TEXT,
  
  standard_methods JSONB DEFAULT '{}'::jsonb,
  equipment_list JSONB DEFAULT '[]'::jsonb,
  
  uses_functional_ranges BOOLEAN DEFAULT FALSE,
  reference_source TEXT,
  
  website TEXT,
  accreditation TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_biomarker_loinc ON biomarker_master(loinc_code);
CREATE INDEX IF NOT EXISTS idx_biomarker_category ON biomarker_master(category);
CREATE INDEX IF NOT EXISTS idx_biomarker_aliases_biomarker ON biomarker_aliases(biomarker_id);
CREATE INDEX IF NOT EXISTS idx_alias_lookup ON biomarker_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_lab_results_user ON lab_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_biomarker ON lab_test_results(biomarker_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_user_biomarker ON lab_test_results(user_id, biomarker_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_document ON lab_test_results(document_id);

-- Enable RLS
ALTER TABLE biomarker_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomarker_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for biomarker_master (public read)
CREATE POLICY "Anyone can view biomarker master data"
  ON biomarker_master FOR SELECT
  USING (true);

-- RLS Policies for biomarker_aliases (public read)
CREATE POLICY "Anyone can view biomarker aliases"
  ON biomarker_aliases FOR SELECT
  USING (true);

-- RLS Policies for lab_test_results
CREATE POLICY "Users can view own lab results"
  ON lab_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lab results"
  ON lab_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lab results"
  ON lab_test_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lab results"
  ON lab_test_results FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view client lab results"
  ON lab_test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = user_id
        AND tc.active = true
    )
  );

-- RLS Policies for laboratory_profiles (public read)
CREATE POLICY "Anyone can view laboratory profiles"
  ON laboratory_profiles FOR SELECT
  USING (true);

-- Insert initial common biomarkers
INSERT INTO biomarker_master (canonical_name, display_name, loinc_code, category, standard_unit, alternative_units, conversion_factors, reference_ranges, description) VALUES
  ('cholesterol_total', 'Total Cholesterol', '2093-3', 'lipids', 'mmol/L', '["mg/dL"]', '{"mg/dL": 38.67}', 
   '{"male": {"18-40": {"min": 3.23, "max": 5.15, "optimal_min": 4.14, "optimal_max": 5.15}, "41-60": {"min": 3.50, "max": 5.60, "optimal_min": 4.20, "optimal_max": 5.40}}, "female": {"18-40": {"min": 3.23, "max": 5.43, "optimal_min": 4.14, "optimal_max": 5.15}, "41-60": {"min": 3.50, "max": 5.87, "optimal_min": 4.20, "optimal_max": 5.40}}}',
   'Total cholesterol is a measure of all cholesterol in the blood'),
   
  ('cholesterol_ldl', 'LDL Cholesterol', '18262-6', 'lipids', 'mmol/L', '["mg/dL"]', '{"mg/dL": 38.67}',
   '{"male": {"18-99": {"min": 0, "max": 3.37, "optimal_min": 1.81, "optimal_max": 2.59}}, "female": {"18-99": {"min": 0, "max": 3.37, "optimal_min": 1.81, "optimal_max": 2.59}}}',
   'Low-density lipoprotein cholesterol, often called "bad" cholesterol'),
   
  ('cholesterol_hdl', 'HDL Cholesterol', '2085-9', 'lipids', 'mmol/L', '["mg/dL"]', '{"mg/dL": 38.67}',
   '{"male": {"18-99": {"min": 1.04, "max": 9.99, "optimal_min": 1.55, "optimal_max": 9.99}}, "female": {"18-99": {"min": 1.29, "max": 9.99, "optimal_min": 1.81, "optimal_max": 9.99}}}',
   'High-density lipoprotein cholesterol, often called "good" cholesterol'),
   
  ('triglycerides', 'Triglycerides', '2571-8', 'lipids', 'mmol/L', '["mg/dL"]', '{"mg/dL": 88.57}',
   '{"male": {"18-99": {"min": 0, "max": 1.70, "optimal_min": 0, "optimal_max": 1.13}}, "female": {"18-99": {"min": 0, "max": 1.70, "optimal_min": 0, "optimal_max": 1.13}}}',
   'A type of fat found in the blood'),
   
  ('glucose', 'Glucose', '2345-7', 'metabolic', 'mmol/L', '["mg/dL"]', '{"mg/dL": 18.02}',
   '{"male": {"18-99": {"min": 3.9, "max": 5.6, "optimal_min": 4.4, "optimal_max": 5.0}}, "female": {"18-99": {"min": 3.9, "max": 5.6, "optimal_min": 4.4, "optimal_max": 5.0}}}',
   'Blood sugar level, primary energy source for cells'),
   
  ('hba1c', 'HbA1c', '4548-4', 'metabolic', '%', '["mmol/mol"]', '{"mmol/mol": 10.93}',
   '{"male": {"18-99": {"min": 4.0, "max": 5.6, "optimal_min": 4.5, "optimal_max": 5.3}}, "female": {"18-99": {"min": 4.0, "max": 5.6, "optimal_min": 4.5, "optimal_max": 5.3}}}',
   'Glycated hemoglobin, measures average blood sugar over 3 months'),
   
  ('creatinine', 'Creatinine', '2160-0', 'kidney', 'µmol/L', '["mg/dL"]', '{"mg/dL": 88.4}',
   '{"male": {"18-99": {"min": 62, "max": 106, "optimal_min": 71, "optimal_max": 97}}, "female": {"18-99": {"min": 44, "max": 80, "optimal_min": 53, "optimal_max": 71}}}',
   'Waste product filtered by kidneys, marker of kidney function'),
   
  ('ggt', 'Gamma-GT', '2324-2', 'liver', 'U/L', '[]', '{}',
   '{"male": {"18-99": {"min": 0, "max": 55, "optimal_min": 10, "optimal_max": 30}}, "female": {"18-99": {"min": 0, "max": 38, "optimal_min": 10, "optimal_max": 25}}}',
   'Liver enzyme, marker of liver function and bile duct issues'),
   
  ('alt', 'ALT (SGPT)', '1742-6', 'liver', 'U/L', '[]', '{}',
   '{"male": {"18-99": {"min": 0, "max": 45, "optimal_min": 10, "optimal_max": 30}}, "female": {"18-99": {"min": 0, "max": 35, "optimal_min": 10, "optimal_max": 25}}}',
   'Alanine aminotransferase, liver enzyme'),
   
  ('ast', 'AST (SGOT)', '1920-8', 'liver', 'U/L', '[]', '{}',
   '{"male": {"18-99": {"min": 0, "max": 40, "optimal_min": 10, "optimal_max": 30}}, "female": {"18-99": {"min": 0, "max": 32, "optimal_min": 10, "optimal_max": 25}}}',
   'Aspartate aminotransferase, liver enzyme'),
   
  ('tsh', 'TSH', '3016-3', 'hormones', 'mU/L', '["µIU/mL"]', '{"µIU/mL": 1.0}',
   '{"male": {"18-99": {"min": 0.4, "max": 4.0, "optimal_min": 1.0, "optimal_max": 2.0}}, "female": {"18-99": {"min": 0.4, "max": 4.0, "optimal_min": 1.0, "optimal_max": 2.0}}}',
   'Thyroid stimulating hormone, regulates thyroid function'),
   
  ('testosterone_total', 'Testosterone Total', '2986-8', 'hormones', 'nmol/L', '["ng/dL"]', '{"ng/dL": 0.0347}',
   '{"male": {"18-40": {"min": 10.4, "max": 34.7, "optimal_min": 17.3, "optimal_max": 28.8}, "41-60": {"min": 7.9, "max": 28.1, "optimal_min": 15.0, "optimal_max": 23.1}}, "female": {"18-40": {"min": 0.5, "max": 2.6, "optimal_min": 1.0, "optimal_max": 2.0}, "41-60": {"min": 0.3, "max": 1.7, "optimal_min": 0.7, "optimal_max": 1.4}}}',
   'Primary male sex hormone, important for muscle mass, bone density, and libido'),
   
  ('vitamin_d', 'Vitamin D (25-OH)', '1989-3', 'vitamins', 'nmol/L', '["ng/mL"]', '{"ng/mL": 2.5}',
   '{"male": {"18-99": {"min": 50, "max": 250, "optimal_min": 75, "optimal_max": 150}}, "female": {"18-99": {"min": 50, "max": 250, "optimal_min": 75, "optimal_max": 150}}}',
   'Fat-soluble vitamin important for bone health and immune function'),
   
  ('vitamin_b12', 'Vitamin B12', '2132-9', 'vitamins', 'pmol/L', '["pg/mL"]', '{"pg/mL": 1.355}',
   '{"male": {"18-99": {"min": 148, "max": 664, "optimal_min": 300, "optimal_max": 550}}, "female": {"18-99": {"min": 148, "max": 664, "optimal_min": 300, "optimal_max": 550}}}',
   'Essential vitamin for red blood cell formation and neurological function'),
   
  ('hemoglobin', 'Hemoglobin', '718-7', 'blood_count', 'g/L', '["g/dL"]', '{"g/dL": 10.0}',
   '{"male": {"18-99": {"min": 130, "max": 170, "optimal_min": 140, "optimal_max": 160}}, "female": {"18-99": {"min": 120, "max": 160, "optimal_min": 130, "optimal_max": 150}}}',
   'Protein in red blood cells that carries oxygen'),
   
  ('wbc', 'White Blood Cells', '6690-2', 'blood_count', 'G/L', '["10^9/L", "K/µL"]', '{"10^9/L": 1.0, "K/µL": 1.0}',
   '{"male": {"18-99": {"min": 4.0, "max": 10.0, "optimal_min": 5.0, "optimal_max": 8.0}}, "female": {"18-99": {"min": 4.0, "max": 10.0, "optimal_min": 5.0, "optimal_max": 8.0}}}',
   'Immune system cells that fight infection'),
   
  ('ferritin', 'Ferritin', '2276-4', 'minerals', 'µg/L', '["ng/mL"]', '{"ng/mL": 1.0}',
   '{"male": {"18-99": {"min": 30, "max": 400, "optimal_min": 70, "optimal_max": 200}}, "female": {"18-99": {"min": 15, "max": 150, "optimal_min": 50, "optimal_max": 100}}}',
   'Protein that stores iron in the body'),
   
  ('iron', 'Iron', '2498-4', 'minerals', 'µmol/L', '["µg/dL"]', '{"µg/dL": 0.179}',
   '{"male": {"18-99": {"min": 10.7, "max": 32.2, "optimal_min": 14.3, "optimal_max": 25.1}}, "female": {"18-99": {"min": 9.0, "max": 30.4, "optimal_min": 12.6, "optimal_max": 23.2}}}',
   'Essential mineral for oxygen transport and energy production'),
   
  ('cortisol', 'Cortisol', '2143-6', 'hormones', 'nmol/L', '["µg/dL"]', '{"µg/dL": 27.59}',
   '{"male": {"18-99": {"min": 138, "max": 690, "optimal_min": 276, "optimal_max": 497}}, "female": {"18-99": {"min": 138, "max": 690, "optimal_min": 276, "optimal_max": 497}}}',
   'Stress hormone produced by adrenal glands'),
   
  ('crp', 'C-Reactive Protein', '1988-5', 'inflammation', 'mg/L', '[]', '{}',
   '{"male": {"18-99": {"min": 0, "max": 3.0, "optimal_min": 0, "optimal_max": 1.0}}, "female": {"18-99": {"min": 0, "max": 3.0, "optimal_min": 0, "optimal_max": 1.0}}}',
   'Marker of inflammation in the body')
ON CONFLICT (canonical_name) DO NOTHING;

-- Insert common aliases
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source) 
SELECT 
  bm.id,
  unnest(ARRAY[
    CASE bm.canonical_name
      WHEN 'cholesterol_total' THEN 'Cholestérol'
      WHEN 'cholesterol_ldl' THEN 'LDL-Cholestérol'
      WHEN 'cholesterol_hdl' THEN 'HDL-Cholestérol'
      WHEN 'triglycerides' THEN 'Triglycérides'
      WHEN 'glucose' THEN 'Glucose'
      WHEN 'hba1c' THEN 'HbA1c'
      WHEN 'creatinine' THEN 'Créatinine'
      WHEN 'ggt' THEN 'Gamma-GT'
      WHEN 'alt' THEN 'ALAT'
      WHEN 'ast' THEN 'ASAT'
      WHEN 'tsh' THEN 'TSH'
      WHEN 'testosterone_total' THEN 'Testostérone'
      WHEN 'vitamin_d' THEN 'Vitamine D'
      WHEN 'vitamin_b12' THEN 'Vitamine B12'
      WHEN 'hemoglobin' THEN 'Hémoglobine'
      WHEN 'wbc' THEN 'Leucocytes'
      WHEN 'ferritin' THEN 'Ferritine'
      WHEN 'iron' THEN 'Fer'
      WHEN 'cortisol' THEN 'Cortisol'
      WHEN 'crp' THEN 'CRP'
    END
  ]),
  'fr',
  'standard'
FROM biomarker_master bm
ON CONFLICT (alias, language) DO NOTHING;