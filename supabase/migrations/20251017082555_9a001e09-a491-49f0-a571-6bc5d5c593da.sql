-- Enable realtime for trainer-client messages
ALTER PUBLICATION supabase_realtime ADD TABLE trainer_client_messages;

-- Replica identity for proper realtime updates
ALTER TABLE trainer_client_messages REPLICA IDENTITY FULL;