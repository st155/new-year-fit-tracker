-- ============================================
-- ЭТАП 1: КРИТИЧЕСКАЯ БЕЗОПАСНОСТЬ
-- ============================================

-- 1. Закрыть публичный доступ к profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view client profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = user_id
      AND tc.active = true
    )
  );

CREATE POLICY "Challenge participants can view each other"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_participants cp1
      INNER JOIN public.challenge_participants cp2 
        ON cp1.challenge_id = cp2.challenge_id
      WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = profiles.user_id
    )
  );

-- 2. Закрыть публичный доступ к activity_feed
DROP POLICY IF EXISTS "Users can view activity feed" ON public.activity_feed;

CREATE POLICY "Users can view own activity"
  ON public.activity_feed FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view client activity"
  ON public.activity_feed FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = user_id
      AND tc.active = true
    )
  );

CREATE POLICY "Challenge participants can view each other activity"
  ON public.activity_feed FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_participants cp1
      INNER JOIN public.challenge_participants cp2 
        ON cp1.challenge_id = cp2.challenge_id
      WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = activity_feed.user_id
    )
  );

-- 3. Закрыть публичный доступ к whoop_user_mapping
CREATE POLICY "Users can view own whoop mapping"
  ON public.whoop_user_mapping FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own whoop mapping"
  ON public.whoop_user_mapping FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whoop mapping"
  ON public.whoop_user_mapping FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Ограничить доступ к challenges (обновить существующие политики)
DROP POLICY IF EXISTS "Trainers can view their challenges v3" ON public.challenges;

CREATE POLICY "Users can view accessible challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR is_challenge_trainer(auth.uid(), id)
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenges.id
      AND cp.user_id = auth.uid()
    )
  );

-- 5. Улучшить политики для goals (уже существуют хорошие политики, но убедимся)
DROP POLICY IF EXISTS "Users can view public challenge goals" ON public.goals;

CREATE POLICY "Users can view challenge goals if participant"
  ON public.goals FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_personal = false AND EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = goals.challenge_id
      AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = goals.user_id
      AND tc.active = true
    )
  );

-- ============================================
-- ЭТАП 3: ОПТИМИЗАЦИЯ - ИНДЕКСЫ
-- ============================================

-- Индексы для activity_feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_date 
  ON public.activity_feed(user_id, measurement_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_activity_feed_subtype 
  ON public.activity_feed(activity_subtype, measurement_date DESC) 
  WHERE activity_subtype IS NOT NULL;

-- Индексы для goals
CREATE INDEX IF NOT EXISTS idx_goals_user_challenge 
  ON public.goals(user_id, challenge_id) 
  WHERE challenge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_goals_personal 
  ON public.goals(user_id, is_personal);

-- Индексы для whoop_tokens
CREATE INDEX IF NOT EXISTS idx_whoop_tokens_user_active 
  ON public.whoop_tokens(user_id, is_active) 
  WHERE is_active = true;

-- Индексы для trainer_clients для быстрой проверки RLS
CREATE INDEX IF NOT EXISTS idx_trainer_clients_trainer_active 
  ON public.trainer_clients(trainer_id, client_id) 
  WHERE active = true;

-- Индексы для challenge_participants для RLS
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user 
  ON public.challenge_participants(user_id, challenge_id);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge 
  ON public.challenge_participants(challenge_id, user_id);

-- Индексы для metric_values для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_metric_values_user_date 
  ON public.metric_values(user_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_metric_values_metric_date 
  ON public.metric_values(metric_id, measurement_date DESC);

-- ============================================
-- ЭТАП 4: МОНИТОРИНГ - ТАБЛИЦА ДЛЯ SECURITY LOGS
-- ============================================

-- Создать таблицу для логирования критических действий безопасности
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  resource_type text,
  resource_id uuid,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Индекс для быстрого поиска по пользователю и времени
CREATE INDEX IF NOT EXISTS idx_security_audit_user_time 
  ON public.security_audit_log(user_id, created_at DESC);

-- Индекс для поиска неудачных попыток
CREATE INDEX IF NOT EXISTS idx_security_audit_failures 
  ON public.security_audit_log(action_type, success, created_at DESC) 
  WHERE success = false;

-- RLS для security_audit_log - только админы и сам пользователь
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own security logs"
  ON public.security_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security logs"
  ON public.security_audit_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security logs"
  ON public.security_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- ЭТАП 3: RATE LIMITING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Индекс для проверки rate limits
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_endpoint_time 
  ON public.api_rate_limits(user_id, endpoint, created_at DESC);

-- Автоматическая очистка старых записей (старше 1 часа)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- RLS для rate limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON public.api_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert rate limits"
  ON public.api_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);