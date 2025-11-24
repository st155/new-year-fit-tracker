-- Create user_supplement_library table
CREATE TABLE user_supplement_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES supplement_products(id) ON DELETE CASCADE,
  first_scanned_at TIMESTAMPTZ DEFAULT now(),
  scan_count INTEGER DEFAULT 1,
  notes TEXT,
  custom_rating NUMERIC(2,1) CHECK (custom_rating >= 1 AND custom_rating <= 5),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Index for efficient lookups
CREATE INDEX idx_user_library_user ON user_supplement_library(user_id);
CREATE INDEX idx_user_library_product ON user_supplement_library(product_id);
CREATE INDEX idx_user_library_tags ON user_supplement_library USING GIN(tags);

-- RLS Policies
ALTER TABLE user_supplement_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own library"
  ON user_supplement_library
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their library"
  ON user_supplement_library
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their library"
  ON user_supplement_library
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their library"
  ON user_supplement_library
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_supplement_library_updated_at
  BEFORE UPDATE ON user_supplement_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();