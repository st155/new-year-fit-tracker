-- Fix Melatonin intake times (CRITICAL!)
UPDATE user_stack 
SET intake_times = ARRAY['evening']::TEXT[]
WHERE product_id IN (
  SELECT id FROM supplement_products 
  WHERE LOWER(name) LIKE '%melatonin%'
)
AND is_active = true;

-- Prevent duplicate supplements in user_stack
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stack_unique_active 
ON user_stack (user_id, product_id) 
WHERE is_active = true;

-- Add comment for clarity
COMMENT ON INDEX idx_user_stack_unique_active IS 'Prevents duplicate active supplements for the same user';