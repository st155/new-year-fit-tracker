-- Ensure REPLICA IDENTITY FULL is set for realtime updates
ALTER TABLE ai_messages REPLICA IDENTITY FULL;