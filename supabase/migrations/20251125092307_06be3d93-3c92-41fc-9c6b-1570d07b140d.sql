-- Create helper function for batch alias insertion
CREATE OR REPLACE FUNCTION insert_biomarker_aliases(
  p_biomarker_canonical_name text,
  p_aliases text[]
)
RETURNS void AS $$
DECLARE
  v_biomarker_id uuid;
  v_alias text;
BEGIN
  -- Get biomarker_id from canonical_name
  SELECT id INTO v_biomarker_id
  FROM biomarker_master
  WHERE LOWER(canonical_name) = LOWER(p_biomarker_canonical_name)
  LIMIT 1;
  
  IF v_biomarker_id IS NULL THEN
    RAISE NOTICE 'Biomarker not found: %', p_biomarker_canonical_name;
    RETURN;
  END IF;
  
  -- Insert all aliases
  FOREACH v_alias IN ARRAY p_aliases
  LOOP
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source)
    VALUES (
      v_biomarker_id,
      v_alias,
      normalize_biomarker_name(v_alias),
      'multi',
      'system_expansion_2025'
    )
    ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;