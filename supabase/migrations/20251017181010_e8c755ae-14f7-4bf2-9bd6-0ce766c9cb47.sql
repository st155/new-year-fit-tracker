-- AI Hub Tables for Trainer

-- Conversations table to store AI chat sessions
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  title TEXT,
  context_mode TEXT NOT NULL DEFAULT 'general', -- 'goals', 'analysis', 'general', 'challenge'
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Messages within conversations
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- для хранения упоминаний, контекста и тд
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pending actions that AI proposed but trainer hasn't executed yet
CREATE TABLE IF NOT EXISTS public.ai_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'update_goal', 'add_measurement', 'create_task', etc.
  action_plan TEXT NOT NULL, -- описание плана от AI
  action_data JSONB NOT NULL, -- структурированные данные для выполнения
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'executed'
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extend ai_action_logs with conversation tracking
ALTER TABLE public.ai_action_logs 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pending_action_id UUID REFERENCES public.ai_pending_actions(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_trainer ON public.ai_conversations(trainer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_pending_actions_trainer ON public.ai_pending_actions(trainer_id, status, created_at DESC);

-- RLS Policies
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pending_actions ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own conversations
CREATE POLICY "Trainers can view their own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can create their own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = trainer_id);

-- Trainers can manage messages in their conversations
CREATE POLICY "Trainers can view messages in their conversations"
  ON public.ai_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.trainer_id = auth.uid()
  ));

CREATE POLICY "Trainers can create messages in their conversations"
  ON public.ai_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.trainer_id = auth.uid()
  ));

-- Trainers can manage their pending actions
CREATE POLICY "Trainers can view their pending actions"
  ON public.ai_pending_actions FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can create their pending actions"
  ON public.ai_pending_actions FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their pending actions"
  ON public.ai_pending_actions FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their pending actions"
  ON public.ai_pending_actions FOR DELETE
  USING (auth.uid() = trainer_id);

-- Trigger to update conversation's last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();