
-- Add aliases for biomarkers with "| Serum" suffix
-- These normalize to {biomarker}serum format

-- Homocysteine | Serum
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, source)
SELECT id, 'Homocysteine | Serum', 'homocysteineserum', 'manual'
FROM biomarker_master WHERE canonical_name = 'homocysteine'
ON CONFLICT DO NOTHING;

-- Bilirubin Total | Serum  
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, source)
SELECT id, 'Bilirubin Total | Serum', 'bilirubintotalserum', 'manual'
FROM biomarker_master WHERE canonical_name = 'bilirubin_total'
ON CONFLICT DO NOTHING;

-- Bilirubin Direct | Serum
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, source)
SELECT id, 'Bilirubin Direct | Serum', 'bilirubindirectserum', 'manual'
FROM biomarker_master WHERE canonical_name = 'bilirubin_direct'
ON CONFLICT DO NOTHING;

-- LDH variations
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, source)
SELECT id, 'LDH', 'ldh', 'manual'
FROM biomarker_master WHERE canonical_name = 'ldh'
ON CONFLICT DO NOTHING;

-- Total Protein variations
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, source)
SELECT id, 'TOTAL PROTEIN', 'totalprotein', 'manual'
FROM biomarker_master WHERE canonical_name = 'total_protein'
ON CONFLICT DO NOTHING;

-- MCV variations
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, source)
SELECT id, 'MCV', 'mcv', 'manual'
FROM biomarker_master WHERE canonical_name = 'mcv'
ON CONFLICT DO NOTHING;

-- Lymphocytes variations
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, source)
SELECT id, 'Lymphocytes', 'lymphocytes', 'manual'
FROM biomarker_master WHERE canonical_name = 'lymphocytes'
ON CONFLICT DO NOTHING;

-- FREE THYROXINE variations
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, source)
SELECT id, 'FREE THYROXINE', 'freethyroxine', 'manual'
FROM biomarker_master WHERE canonical_name = 't4_free'
ON CONFLICT DO NOTHING;
