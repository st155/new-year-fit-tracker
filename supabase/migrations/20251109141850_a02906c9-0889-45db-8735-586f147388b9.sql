-- Phase 6: Part 2 - Friends System

CREATE TABLE public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id),
  CHECK (status IN ('pending', 'accepted', 'blocked'))
);

CREATE INDEX idx_friendships_user ON public.friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON public.friendships(friend_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть свои дружеские связи
CREATE POLICY "Users can view their friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Пользователи могут создавать запросы в друзья
CREATE POLICY "Users can create friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять статус дружбы
CREATE POLICY "Users can update friendship status"
ON public.friendships FOR UPDATE
USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Пользователи могут удалять свои дружеские связи
CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);