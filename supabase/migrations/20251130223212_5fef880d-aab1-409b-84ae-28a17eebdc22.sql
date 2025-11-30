-- Add conversion factors for insulin_fasting biomarker
UPDATE biomarker_master
SET conversion_factors = jsonb_build_object(
  'pmol/L', 0.1446,
  'pmol/l', 0.1446,
  'пмоль/л', 0.1446,
  'mIU/L', 1.0,
  'mIU/l', 1.0,
  'мМЕ/л', 1.0,
  'µIU/mL', 1.0,
  'uIU/mL', 1.0,
  'мкМЕ/мл', 1.0
)
WHERE canonical_name = 'insulin_fasting';