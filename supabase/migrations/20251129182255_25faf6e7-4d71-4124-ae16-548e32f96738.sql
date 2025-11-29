-- Add new fields to supplement_products for enhanced label data extraction
ALTER TABLE supplement_products 
ADD COLUMN IF NOT EXISTS price text,
ADD COLUMN IF NOT EXISTS certifications text[],
ADD COLUMN IF NOT EXISTS storage_instructions text,
ADD COLUMN IF NOT EXISTS country_of_origin text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS label_benefits text[],
ADD COLUMN IF NOT EXISTS label_description text;

-- Add comment for clarity
COMMENT ON COLUMN supplement_products.label_benefits IS 'Benefits extracted directly from product label (vs AI-generated)';
COMMENT ON COLUMN supplement_products.label_description IS 'Description extracted from label (vs AI-generated)';