-- Sprint 1: Database Foundation for Vivino-style supplement info
-- Add enriched data fields to supplement_products table

ALTER TABLE supplement_products
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS benefits TEXT[],
ADD COLUMN IF NOT EXISTS research_summary TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_info JSONB,
ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_supplement_products_popularity ON supplement_products(popularity_score DESC);

COMMENT ON COLUMN supplement_products.description IS 'AI-generated comprehensive description of the supplement';
COMMENT ON COLUMN supplement_products.benefits IS 'Array of key benefits';
COMMENT ON COLUMN supplement_products.research_summary IS 'Summary of research and scientific backing';
COMMENT ON COLUMN supplement_products.manufacturer_info IS 'JSON with manufacturer details: {country, founded_year, description, website}';
COMMENT ON COLUMN supplement_products.avg_rating IS 'Average user rating (0-5)';
COMMENT ON COLUMN supplement_products.total_ratings IS 'Total number of user ratings';
COMMENT ON COLUMN supplement_products.popularity_score IS 'Number of active users taking this supplement';