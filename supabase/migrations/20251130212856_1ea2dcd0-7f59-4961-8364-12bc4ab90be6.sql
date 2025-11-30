-- Phase 1: Improve normalize_biomarker_name function
CREATE OR REPLACE FUNCTION normalize_biomarker_name(name TEXT) RETURNS TEXT AS $$
BEGIN
  -- First strip common lab suffixes before normalization
  name := REGEXP_REPLACE(name, '\s*\|\s*(Serum|Whole Blood|Plasma|Urine|Blood)$', '', 'i');
  name := REGEXP_REPLACE(name, '\s*\((Serum|Plasma|Blood|Urine)\)$', '', 'i');
  
  -- Replace Greek letter gamma with 'gamma'
  name := REPLACE(name, 'γ', 'gamma');
  name := REPLACE(name, 'Γ', 'gamma');
  
  -- Remove all non-alphanumeric characters and convert to lowercase
  RETURN LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Phase 2: Add temp column for new normalized values
ALTER TABLE biomarker_aliases ADD COLUMN IF NOT EXISTS temp_normalized TEXT;

-- Calculate new normalized values
UPDATE biomarker_aliases
SET temp_normalized = normalize_biomarker_name(alias);

-- Phase 3: Delete rows that would create duplicates, keeping only the oldest
DELETE FROM biomarker_aliases
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY biomarker_id, temp_normalized 
        ORDER BY created_at ASC
      ) as rn
    FROM biomarker_aliases
  ) sub
  WHERE rn > 1
);

-- Phase 4: Now update the real column
UPDATE biomarker_aliases
SET alias_normalized = temp_normalized;

-- Drop temp column
ALTER TABLE biomarker_aliases DROP COLUMN temp_normalized;

-- Phase 5: Add new biomarkers
INSERT INTO biomarker_master (
  canonical_name, display_name, category, standard_unit, 
  reference_ranges, data_type, description
)
SELECT 'dhea_s', 'DHEA-S (Dehydroepiandrosterone Sulfate)', 'hormones', 'µmol/L',
  '{"male": {"min": 2.2, "max": 15.2}, "female": {"min": 0.9, "max": 11.7}}'::jsonb, 'quantitative',
  'Adrenal androgen hormone that declines with age. Important for assessing adrenal function and aging markers.'
WHERE NOT EXISTS (SELECT 1 FROM biomarker_master WHERE canonical_name = 'dhea_s');

INSERT INTO biomarker_master (
  canonical_name, display_name, category, standard_unit, 
  reference_ranges, data_type, description
)
SELECT 'uibc', 'UIBC (Unsaturated Iron Binding Capacity)', 'iron', 'µmol/L',
  '{"general": {"min": 24.2, "max": 70.1}}'::jsonb, 'quantitative',
  'Measures the reserve capacity of transferrin to bind additional iron. Used with iron and TIBC to assess iron status.'
WHERE NOT EXISTS (SELECT 1 FROM biomarker_master WHERE canonical_name = 'uibc');

-- Phase 6: Add critical aliases (simplified, most important ones only)
DO $$
DECLARE
  v_biomarker_id UUID;
  v_normalized TEXT;
BEGIN
  -- ASTO
  SELECT id INTO v_biomarker_id FROM biomarker_master WHERE canonical_name = 'aso';
  IF v_biomarker_id IS NOT NULL THEN
    v_normalized := normalize_biomarker_name('ASTO');
    IF NOT EXISTS (SELECT 1 FROM biomarker_aliases WHERE biomarker_id = v_biomarker_id AND alias_normalized = v_normalized) THEN
      INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized) VALUES (v_biomarker_id, 'ASTO', v_normalized);
    END IF;
  END IF;

  -- Red cell folate
  SELECT id INTO v_biomarker_id FROM biomarker_master WHERE canonical_name = 'folate';
  IF v_biomarker_id IS NOT NULL THEN
    v_normalized := normalize_biomarker_name('Red cell folate');
    IF NOT EXISTS (SELECT 1 FROM biomarker_aliases WHERE biomarker_id = v_biomarker_id AND alias_normalized = v_normalized) THEN
      INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized) VALUES (v_biomarker_id, 'Red cell folate', v_normalized);
    END IF;
  END IF;

  -- Corrected Calcium
  SELECT id INTO v_biomarker_id FROM biomarker_master WHERE canonical_name = 'calcium';
  IF v_biomarker_id IS NOT NULL THEN
    v_normalized := normalize_biomarker_name('Corrected Calcium');
    IF NOT EXISTS (SELECT 1 FROM biomarker_aliases WHERE biomarker_id = v_biomarker_id AND alias_normalized = v_normalized) THEN
      INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized) VALUES (v_biomarker_id, 'Corrected Calcium', v_normalized);
    END IF;
  END IF;

  -- LDH
  SELECT id INTO v_biomarker_id FROM biomarker_master WHERE canonical_name = 'ldh';
  IF v_biomarker_id IS NOT NULL THEN
    v_normalized := normalize_biomarker_name('Lactate Dehydrogenase');
    IF NOT EXISTS (SELECT 1 FROM biomarker_aliases WHERE biomarker_id = v_biomarker_id AND alias_normalized = v_normalized) THEN
      INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized) VALUES (v_biomarker_id, 'Lactate Dehydrogenase', v_normalized);
    END IF;
  END IF;

  -- DHEA-S (new biomarker)
  SELECT id INTO v_biomarker_id FROM biomarker_master WHERE canonical_name = 'dhea_s';
  IF v_biomarker_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized) 
    VALUES 
      (v_biomarker_id, 'DHEA-S', normalize_biomarker_name('DHEA-S')),
      (v_biomarker_id, 'Дегидроэпиандростерон-сульфат', normalize_biomarker_name('Дегидроэпиандростерон-сульфат'));
  END IF;

  -- UIBC (new biomarker)
  SELECT id INTO v_biomarker_id FROM biomarker_master WHERE canonical_name = 'uibc';
  IF v_biomarker_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized) 
    VALUES 
      (v_biomarker_id, 'UIBC', normalize_biomarker_name('UIBC')),
      (v_biomarker_id, 'Ненасыщенная железосвязывающая способность', normalize_biomarker_name('Ненасыщенная железосвязывающая способность'));
  END IF;
END $$;

-- Phase 7: Final rematch
WITH matched_aliases AS (
  SELECT DISTINCT ON (ltr.id)
    ltr.id as result_id,
    ba.biomarker_id
  FROM lab_test_results ltr
  JOIN biomarker_aliases ba ON normalize_biomarker_name(ltr.raw_test_name) = ba.alias_normalized
  WHERE ltr.biomarker_id IS NULL
  ORDER BY ltr.id, ba.created_at DESC
)
UPDATE lab_test_results
SET biomarker_id = matched_aliases.biomarker_id
FROM matched_aliases
WHERE lab_test_results.id = matched_aliases.result_id;