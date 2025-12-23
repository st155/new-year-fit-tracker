-- Add linked_product_id column to protocol_items for linking to user library products
ALTER TABLE protocol_items 
ADD COLUMN IF NOT EXISTS linked_product_id UUID REFERENCES supplement_products(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_protocol_items_linked_product ON protocol_items(linked_product_id) WHERE linked_product_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN protocol_items.linked_product_id IS 'Optional link to a specific product from user supplement library';