-- Создаем таблицы для Terra API Supabase интеграции
-- Эти таблицы необходимы для прямой интеграции Terra -> Supabase Storage

CREATE TABLE IF NOT EXISTS public.terra_users (
  user_id VARCHAR(36) PRIMARY KEY,
  reference_id TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  granted_scopes TEXT DEFAULT NULL,
  provider TEXT NOT NULL,
  state VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS public.terra_data_payloads (
  user_id VARCHAR(36) NOT NULL,
  data_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_id TEXT NOT NULL,
  start_time TEXT DEFAULT NULL,
  end_time TEXT DEFAULT NULL,
  CONSTRAINT terra_data_payloads_pkey PRIMARY KEY (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS public.terra_misc_payloads (
  user_id VARCHAR(36) NOT NULL,
  data_type TEXT DEFAULT NULL,
  payload_type TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  payload_id TEXT NOT NULL,
  CONSTRAINT terra_misc_payloads_pkey PRIMARY KEY (user_id, created_at)
);

-- Включаем RLS для безопасности
ALTER TABLE public.terra_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terra_data_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terra_misc_payloads ENABLE ROW LEVEL SECURITY;

-- Политики для terra_users
-- Service role может делать всё (для Terra API)
CREATE POLICY "Service role full access to terra_users"
ON public.terra_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Пользователи могут видеть свои записи по reference_id
CREATE POLICY "Users can view their terra_users"
ON public.terra_users
FOR SELECT
TO authenticated
USING (reference_id = auth.uid()::text);

-- Политики для terra_data_payloads
CREATE POLICY "Service role full access to terra_data_payloads"
ON public.terra_data_payloads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their terra_data_payloads"
ON public.terra_data_payloads
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT user_id FROM public.terra_users 
    WHERE reference_id = auth.uid()::text
  )
);

-- Политики для terra_misc_payloads
CREATE POLICY "Service role full access to terra_misc_payloads"
ON public.terra_misc_payloads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their terra_misc_payloads"
ON public.terra_misc_payloads
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT user_id FROM public.terra_users 
    WHERE reference_id = auth.uid()::text
  )
);