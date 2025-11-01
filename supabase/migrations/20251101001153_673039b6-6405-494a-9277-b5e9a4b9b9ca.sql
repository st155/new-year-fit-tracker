-- Enable realtime for ai_messages table
ALTER TABLE ai_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_messages;

-- Enable realtime for ai_conversations table
ALTER TABLE ai_conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_conversations;