-- Add linked_goal_id to habits table for Goal-Habit integration
ALTER TABLE habits ADD COLUMN linked_goal_id uuid REFERENCES goals(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_habits_linked_goal ON habits(linked_goal_id);

-- Add RLS policy to allow users to view habits linked to their goals
CREATE POLICY "Users can view habits linked to their goals"
ON habits FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = habits.linked_goal_id
    AND goals.user_id = auth.uid()
  )
);