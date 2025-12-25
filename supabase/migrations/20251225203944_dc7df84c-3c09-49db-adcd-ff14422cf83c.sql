-- Add target_reps to goals table for strength exercises (1RM or working sets)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_reps INTEGER DEFAULT NULL;

-- Add reps to measurements table for tracking weight × reps
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS reps INTEGER DEFAULT NULL;

-- Update Anton's strength goals with reps
-- Жим лёжа: 105 kg × 1 (1RM)
UPDATE goals SET target_reps = 1 WHERE id = '152b8ccf-4636-4d48-8066-a2fed80b5a56';

-- Выпады назад со штангой: 60 kg × 8
UPDATE goals SET target_reps = 8 WHERE id = 'dba8f40c-ddcd-4047-8fbc-72d979fa2bf8';

-- Add comment explaining the field
COMMENT ON COLUMN goals.target_reps IS 'Number of repetitions for strength goals. 1 = 1RM, 8-10 = working sets';
COMMENT ON COLUMN measurements.reps IS 'Number of repetitions performed for strength measurements';