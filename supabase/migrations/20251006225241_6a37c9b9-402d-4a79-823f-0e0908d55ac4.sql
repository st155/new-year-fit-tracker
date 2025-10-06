-- Включаем realtime для таблицы challenge_chat_messages
ALTER TABLE public.challenge_chat_messages REPLICA IDENTITY FULL;

-- Добавляем таблицу в публикацию realtime (если еще не добавлена)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'challenge_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_chat_messages;
  END IF;
END $$;