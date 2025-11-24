-- Create protocol parsing history table
CREATE TABLE IF NOT EXISTS protocol_parsing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  parsed_supplements JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  was_used BOOLEAN DEFAULT false
);

-- Create index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_protocol_parsing_history_user_id 
  ON protocol_parsing_history(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE protocol_parsing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own parsing history
CREATE POLICY "Users can view their own parsing history"
  ON protocol_parsing_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own parsing history
CREATE POLICY "Users can insert their own parsing history"
  ON protocol_parsing_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);