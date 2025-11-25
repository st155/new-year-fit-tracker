-- Fix conversion factors in biomarker_master for proper unit conversion
-- CRITICAL: All conversion factors should be multipliers to convert FROM source unit TO standard_unit

-- For biomarkers with standard_unit = 'mmol/L':
-- Cholesterol: mg/dL → mmol/L requires DIVIDING by 38.67, so factor = 1/38.67 = 0.0259
-- Glucose: mg/dL → mmol/L requires DIVIDING by 18.02, so factor = 1/18.02 = 0.0555  
-- Triglycerides: mg/dL → mmol/L requires DIVIDING by 88.57, so factor = 1/88.57 = 0.0113

-- For biomarkers with standard_unit = 'µmol/L':
-- Creatinine: mg/dL → µmol/L requires MULTIPLYING by 88.4 (already correct)

-- Update Cholesterol - Total
UPDATE biomarker_master
SET conversion_factors = jsonb_build_object(
  'mg/dL', 0.0259,
  'mg/dl', 0.0259,
  'mg/L', 0.00259
)
WHERE canonical_name = 'cholesterol_total';

-- Update HDL Cholesterol
UPDATE biomarker_master
SET conversion_factors = jsonb_build_object(
  'mg/dL', 0.0259,
  'mg/dl', 0.0259,
  'mg/L', 0.00259
)
WHERE canonical_name = 'cholesterol_hdl';

-- Update LDL Cholesterol
UPDATE biomarker_master
SET conversion_factors = jsonb_build_object(
  'mg/dL', 0.0259,
  'mg/dl', 0.0259,
  'mg/L', 0.00259
)
WHERE canonical_name = 'cholesterol_ldl';

-- Update Glucose
UPDATE biomarker_master
SET conversion_factors = jsonb_build_object(
  'mg/dL', 0.0555,
  'mg/dl', 0.0555,
  'mg/L', 0.00555
)
WHERE canonical_name = 'glucose';

-- Update Triglycerides
UPDATE biomarker_master
SET conversion_factors = jsonb_build_object(
  'mg/dL', 0.0113,
  'mg/dl', 0.0113,
  'mg/L', 0.00113
)
WHERE canonical_name = 'triglycerides';

-- Verify Creatinine conversion factor (should already be correct: 88.4 for mg/dL → µmol/L)
UPDATE biomarker_master
SET conversion_factors = jsonb_build_object(
  'mg/dL', 88.4,
  'mg/dl', 88.4,
  'mg/L', 8.84,
  'umol/L', 1.0,
  'µmol/L', 1.0
)
WHERE canonical_name = 'creatinine';