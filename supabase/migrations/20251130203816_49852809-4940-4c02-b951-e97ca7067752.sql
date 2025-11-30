-- Rematch unmatched lab results with existing aliases
-- Uses JavaScript-style normalization (lowercase, remove all non-alphanumeric)

UPDATE lab_test_results ltr
SET biomarker_id = ba.biomarker_id
FROM biomarker_aliases ba
WHERE ltr.biomarker_id IS NULL
  AND LOWER(REGEXP_REPLACE(ltr.raw_test_name, '[^a-zA-Z0-9]', '', 'g')) = ba.alias_normalized;