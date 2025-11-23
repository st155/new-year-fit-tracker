-- BioStack V3.0: Biohacking Correlation Engine
-- Sprint 1: Database Foundation

-- =====================================================
-- TABLE 1: user_stack (Replaces protocols + user_inventory)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES supplement_products(id) ON DELETE SET NULL,
  
  -- Core Properties
  stack_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Smart Scheduling
  schedule_type TEXT NOT NULL DEFAULT 'daily',
  schedule_cron TEXT,
  intake_times TEXT[] DEFAULT ARRAY['morning'],
  
  -- Biohacking Links
  linked_biomarker_ids UUID[] DEFAULT ARRAY[]::UUID[],
  target_outcome TEXT,
  
  -- AI Intelligence
  ai_suggested BOOLEAN DEFAULT false,
  ai_rationale TEXT,
  effectiveness_score NUMERIC(3,1) DEFAULT 5.0,
  
  -- Simple Inventory
  servings_remaining INTEGER,
  reorder_threshold INTEGER DEFAULT 10,
  
  -- Metadata
  position INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_stack_user ON user_stack(user_id, is_active);
CREATE INDEX idx_user_stack_biomarkers ON user_stack USING GIN(linked_biomarker_ids);
CREATE INDEX idx_user_stack_times ON user_stack USING GIN(intake_times);

ALTER TABLE user_stack ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stack" ON user_stack FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stack items" ON user_stack FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stack items" ON user_stack FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stack items" ON user_stack FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TABLE 2: intake_logs (Simplified supplement_logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS intake_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stack_item_id UUID REFERENCES user_stack(id) ON DELETE SET NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  servings_taken NUMERIC DEFAULT 1,
  felt_effect TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intake_logs_user_time ON intake_logs(user_id, taken_at DESC);
CREATE INDEX idx_intake_logs_stack ON intake_logs(stack_item_id, taken_at DESC);

ALTER TABLE intake_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own intake logs" ON intake_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own intake logs" ON intake_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own intake logs" ON intake_logs FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TABLE 3: biomarker_correlations (The AI Brain)
-- =====================================================
CREATE TABLE IF NOT EXISTS biomarker_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_name TEXT NOT NULL,
  biomarker_id UUID REFERENCES biomarker_master(id) ON DELETE CASCADE,
  correlation_type TEXT NOT NULL,
  expected_change_percent NUMERIC,
  timeframe_weeks INTEGER,
  evidence_level TEXT DEFAULT 'moderate',
  research_summary TEXT,
  pubmed_links TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_correlations_supplement ON biomarker_correlations(supplement_name);
CREATE INDEX idx_correlations_biomarker ON biomarker_correlations(biomarker_id);

ALTER TABLE biomarker_correlations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view biomarker correlations" ON biomarker_correlations FOR SELECT USING (true);

-- =====================================================
-- TABLE 4: stack_effectiveness (Analytics Cache)
-- =====================================================
CREATE TABLE IF NOT EXISTS stack_effectiveness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stack_item_id UUID REFERENCES user_stack(id) ON DELETE CASCADE,
  biomarker_id UUID REFERENCES biomarker_master(id) ON DELETE CASCADE,
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  biomarker_value_before NUMERIC,
  biomarker_value_after NUMERIC,
  change_percent NUMERIC,
  correlation_score NUMERIC(3,1),
  total_days INTEGER,
  days_taken INTEGER,
  consistency_percent NUMERIC,
  ai_verdict TEXT,
  ai_explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_effectiveness_user ON stack_effectiveness(user_id, biomarker_id);
CREATE INDEX idx_effectiveness_stack ON stack_effectiveness(stack_item_id);

ALTER TABLE stack_effectiveness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own effectiveness data" ON stack_effectiveness FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert effectiveness data" ON stack_effectiveness FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stack_updated_at
  BEFORE UPDATE ON user_stack
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biomarker_correlations_updated_at
  BEFORE UPDATE ON biomarker_correlations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();