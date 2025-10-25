-- Create activity_reactions table for emoji reactions
CREATE TABLE activity_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activity_feed(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('thumbs_up', 'fire', 'muscle', 'party', 'heart')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(activity_id, user_id, reaction_type)
);

-- Create indexes for performance
CREATE INDEX idx_activity_reactions_activity_id ON activity_reactions(activity_id);
CREATE INDEX idx_activity_reactions_user_id ON activity_reactions(user_id);

-- Enable RLS
ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Challenge participants can view reactions on activity"
ON activity_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM activity_feed af
    JOIN challenge_participants cp1 ON cp1.user_id = af.user_id
    JOIN challenge_participants cp2 ON cp2.challenge_id = cp1.challenge_id
    WHERE af.id = activity_reactions.activity_id
    AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add their own reactions"
ON activity_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON activity_reactions FOR DELETE
USING (auth.uid() = user_id);