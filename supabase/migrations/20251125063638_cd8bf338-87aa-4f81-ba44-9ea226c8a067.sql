-- ============================================
-- FIX BIOMARKER MATCHING - Clean duplicates and update schema
-- ============================================

-- 1. Fix normalize_biomarker_name function
DROP FUNCTION IF EXISTS normalize_biomarker_name(text);

CREATE OR REPLACE FUNCTION normalize_biomarker_name(name text)
RETURNS text AS $$
BEGIN
  -- Normalize: lowercase, remove special chars (but preserve letters with accents), trim spaces
  RETURN LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Zà-üÀ-Ü0-9]', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_biomarker_name IS 'Normalizes biomarker names: lowercase, remove special chars, preserve accented letters';


-- 2. Update all alias_normalized values with corrected function
UPDATE biomarker_aliases
SET alias_normalized = normalize_biomarker_name(alias);


-- 3. Remove duplicates - keep only one record per (biomarker_id, alias_normalized) pair
DELETE FROM biomarker_aliases a
USING biomarker_aliases b
WHERE a.id > b.id
  AND a.biomarker_id = b.biomarker_id
  AND a.alias_normalized = b.alias_normalized;


-- 4. Create unique index on (biomarker_id, alias_normalized) for ON CONFLICT support
CREATE UNIQUE INDEX IF NOT EXISTS idx_biomarker_aliases_unique 
ON biomarker_aliases (biomarker_id, alias_normalized);