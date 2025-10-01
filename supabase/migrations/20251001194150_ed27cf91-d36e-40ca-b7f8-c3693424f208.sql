-- Таблица для сообщений чата челленджа
CREATE TABLE public.challenge_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_edited BOOLEAN NOT NULL DEFAULT false
);

-- Включаем RLS
ALTER TABLE public.challenge_chat_messages ENABLE ROW LEVEL SECURITY;

-- Политики для чата
CREATE POLICY "Участники могут просматривать сообщения чата"
ON public.challenge_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = challenge_chat_messages.challenge_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Участники могут отправлять сообщения в чат"
ON public.challenge_chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = challenge_chat_messages.challenge_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Пользователи могут редактировать свои сообщения"
ON public.challenge_chat_messages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои сообщения"
ON public.challenge_chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Триггер для updated_at
CREATE TRIGGER update_challenge_chat_messages_updated_at
BEFORE UPDATE ON public.challenge_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы для производительности
CREATE INDEX idx_challenge_chat_messages_challenge_id ON public.challenge_chat_messages(challenge_id);
CREATE INDEX idx_challenge_chat_messages_created_at ON public.challenge_chat_messages(created_at DESC);

-- Включаем Realtime для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_chat_messages;