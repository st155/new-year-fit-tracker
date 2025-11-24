-- Add detailed supplement information fields
ALTER TABLE supplement_products 
ADD COLUMN IF NOT EXISTS recommended_daily_intake TEXT,
ADD COLUMN IF NOT EXISTS ingredients TEXT[],
ADD COLUMN IF NOT EXISTS warnings TEXT,
ADD COLUMN IF NOT EXISTS expiration_info TEXT;

-- Add shared usage tracking
ALTER TABLE user_stack
ADD COLUMN IF NOT EXISTS approximate_servings BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_with_others BOOLEAN DEFAULT false;