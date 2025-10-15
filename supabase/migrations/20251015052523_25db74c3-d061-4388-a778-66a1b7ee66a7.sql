-- Add new columns to inbody_analyses for comprehensive InBody data
-- ECW Analysis fields
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS intracellular_water NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS extracellular_water NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS ecw_ratio NUMERIC;

-- Research Parameters
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS body_cell_mass NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS smi NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS waist_hip_ratio NUMERIC;

-- Segmental Analysis ECW ratios
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS right_arm_ecw_ratio NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS left_arm_ecw_ratio NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS trunk_ecw_ratio NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS right_leg_ecw_ratio NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS left_leg_ecw_ratio NUMERIC;

-- Segmental Analysis lean mass
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS right_arm_lean_mass NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS left_arm_lean_mass NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS trunk_lean_mass NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS right_leg_lean_mass NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS left_leg_lean_mass NUMERIC;

-- Additional body composition fields
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS soft_lean_mass NUMERIC;
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS fat_free_mass NUMERIC;

-- Store full parsed data as JSON
ALTER TABLE inbody_analyses ADD COLUMN IF NOT EXISTS parsed_data JSONB;

COMMENT ON COLUMN inbody_analyses.intracellular_water IS 'Intracellular water in L';
COMMENT ON COLUMN inbody_analyses.extracellular_water IS 'Extracellular water in L';
COMMENT ON COLUMN inbody_analyses.ecw_ratio IS 'ECW/TBW ratio';
COMMENT ON COLUMN inbody_analyses.body_cell_mass IS 'Body cell mass in kg';
COMMENT ON COLUMN inbody_analyses.smi IS 'Skeletal Muscle Index';
COMMENT ON COLUMN inbody_analyses.parsed_data IS 'Full InBodyData JSON for comprehensive analysis';