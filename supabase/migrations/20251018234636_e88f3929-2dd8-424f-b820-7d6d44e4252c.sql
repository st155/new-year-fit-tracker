-- Add 'preparing' status to ai_pending_actions
ALTER TABLE ai_pending_actions 
DROP CONSTRAINT IF EXISTS ai_pending_actions_status_check;

ALTER TABLE ai_pending_actions
ADD CONSTRAINT ai_pending_actions_status_check 
CHECK (status IN ('preparing', 'pending', 'approved', 'rejected', 'executed'));

-- Add index for quick lookup of preparing actions
CREATE INDEX IF NOT EXISTS idx_pending_actions_preparing 
ON ai_pending_actions(status) 
WHERE status = 'preparing';

-- Add index for quick lookup by conversation_id
CREATE INDEX IF NOT EXISTS idx_pending_actions_conversation 
ON ai_pending_actions(conversation_id);