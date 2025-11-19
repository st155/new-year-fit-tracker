-- =====================================================
-- BioStack Phase 1: Database Schema
-- =====================================================
-- Creates tables for supplement tracking, protocols, and inventory management

-- =====================================================
-- 1. SUPPLEMENT PRODUCTS (Global Library)
-- =====================================================
CREATE TABLE IF NOT EXISTS supplement_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  form TEXT CHECK (form IN ('capsule', 'tablet', 'powder', 'liquid', 'gummy', 'softgel', 'other')),
  dosage_amount NUMERIC NOT NULL CHECK (dosage_amount > 0),
  dosage_unit TEXT NOT NULL CHECK (dosage_unit IN ('mg', 'g', 'mcg', 'IU', 'ml', 'serving')),
  servings_per_container INTEGER CHECK (servings_per_container > 0),
  image_url TEXT,
  barcode TEXT,
  manufacturer TEXT,
  category TEXT,
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brand, name, form, dosage_amount, dosage_unit)
);

-- =====================================================
-- 2. PROTOCOLS (User's supplement regimens)
-- =====================================================
CREATE TABLE IF NOT EXISTS protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  ai_generated BOOLEAN DEFAULT false,
  ai_rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- =====================================================
-- 3. PROTOCOL ITEMS (Individual supplements in a protocol)
-- =====================================================
CREATE TABLE IF NOT EXISTS protocol_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES supplement_products(id) ON DELETE RESTRICT,
  daily_dosage NUMERIC NOT NULL CHECK (daily_dosage > 0),
  intake_times TEXT[] NOT NULL DEFAULT ARRAY['morning'],
  schedule_logic JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(protocol_id, product_id)
);

-- =====================================================
-- 4. USER INVENTORY (Physical supplements owned)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES supplement_products(id) ON DELETE RESTRICT,
  current_servings NUMERIC NOT NULL DEFAULT 0 CHECK (current_servings >= 0),
  initial_servings NUMERIC CHECK (initial_servings > 0),
  expiry_date DATE,
  purchase_date DATE DEFAULT CURRENT_DATE,
  cost NUMERIC CHECK (cost >= 0),
  low_stock_threshold NUMERIC DEFAULT 10 CHECK (low_stock_threshold >= 0),
  is_low_alert BOOLEAN DEFAULT false,
  batch_number TEXT,
  storage_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 5. SUPPLEMENT LOGS (Tracking intake)
-- =====================================================
CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_item_id UUID REFERENCES protocol_items(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES user_inventory(id) ON DELETE SET NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  taken_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'taken', 'skipped', 'missed')),
  servings_taken NUMERIC CHECK (servings_taken > 0),
  notes TEXT,
  side_effects TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_taken_time CHECK (taken_at IS NULL OR taken_at >= scheduled_time - INTERVAL '4 hours')
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX idx_supplement_products_brand ON supplement_products(brand);
CREATE INDEX idx_supplement_products_category ON supplement_products(category);
CREATE INDEX idx_supplement_products_barcode ON supplement_products(barcode) WHERE barcode IS NOT NULL;

CREATE INDEX idx_protocols_user_id ON protocols(user_id);
CREATE INDEX idx_protocols_active ON protocols(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_protocols_dates ON protocols(user_id, start_date, end_date);

CREATE INDEX idx_protocol_items_protocol_id ON protocol_items(protocol_id);
CREATE INDEX idx_protocol_items_product_id ON protocol_items(product_id);

CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_product_id ON user_inventory(product_id);
CREATE INDEX idx_user_inventory_low_stock ON user_inventory(user_id, is_low_alert) WHERE is_low_alert = true;
CREATE INDEX idx_user_inventory_expiry ON user_inventory(user_id, expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_supplement_logs_user_id ON supplement_logs(user_id);
CREATE INDEX idx_supplement_logs_scheduled ON supplement_logs(user_id, scheduled_time);
CREATE INDEX idx_supplement_logs_status ON supplement_logs(user_id, status, scheduled_time);
CREATE INDEX idx_supplement_logs_protocol_item ON supplement_logs(protocol_item_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE supplement_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: supplement_products (Global library)
-- =====================================================
CREATE POLICY "Anyone can view supplement products"
  ON supplement_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add products"
  ON supplement_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role has full access to products"
  ON supplement_products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- RLS POLICIES: protocols
-- =====================================================
CREATE POLICY "Users can view own protocols"
  ON protocols FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own protocols"
  ON protocols FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own protocols"
  ON protocols FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own protocols"
  ON protocols FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view client protocols"
  ON protocols FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = protocols.user_id
        AND tc.active = true
    )
  );

-- =====================================================
-- RLS POLICIES: protocol_items
-- =====================================================
CREATE POLICY "Users can manage own protocol items"
  ON protocol_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_items.protocol_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_items.protocol_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view client protocol items"
  ON protocol_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protocols p
      JOIN trainer_clients tc ON tc.client_id = p.user_id
      WHERE p.id = protocol_items.protocol_id
        AND tc.trainer_id = auth.uid()
        AND tc.active = true
    )
  );

-- =====================================================
-- RLS POLICIES: user_inventory
-- =====================================================
CREATE POLICY "Users can manage own inventory"
  ON user_inventory FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to inventory"
  ON user_inventory FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- RLS POLICIES: supplement_logs
-- =====================================================
CREATE POLICY "Users can manage own supplement logs"
  ON supplement_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to logs"
  ON supplement_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplement_products_updated_at
  BEFORE UPDATE ON supplement_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON protocols
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocol_items_updated_at
  BEFORE UPDATE ON protocol_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_inventory_updated_at
  BEFORE UPDATE ON user_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplement_logs_updated_at
  BEFORE UPDATE ON supplement_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();