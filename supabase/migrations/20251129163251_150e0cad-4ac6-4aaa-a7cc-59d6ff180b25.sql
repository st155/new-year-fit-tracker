-- Add source column to user_supplement_library to track where supplements came from
ALTER TABLE user_supplement_library 
ADD COLUMN source TEXT DEFAULT 'scan' 
CHECK (source IN ('scan', 'protocol', 'manual'));

-- Update existing records to have source='scan'
UPDATE user_supplement_library SET source = 'scan' WHERE source IS NULL;

-- Add comment
COMMENT ON COLUMN user_supplement_library.source IS 'Origin of library entry: scan (camera), protocol (from active protocol), manual (manually added)';