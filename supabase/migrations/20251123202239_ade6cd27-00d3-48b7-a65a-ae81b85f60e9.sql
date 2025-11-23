-- Make lab_test_results.unit nullable for dimensionless biomarkers
-- Some biomarkers like ratios or dimensionless values don't have units

ALTER TABLE lab_test_results 
ALTER COLUMN unit DROP NOT NULL;

-- Set default '-' for existing NULL units
UPDATE lab_test_results 
SET unit = '-' 
WHERE unit IS NULL;

COMMENT ON COLUMN lab_test_results.unit IS 'Unit of measurement; can be NULL for dimensionless biomarkers, defaults to ''-'' in application layer';