-- Добавляем роли в профили (у нас уже есть trainer_role, но добавим enum для расширения)
CREATE TYPE public.app_role AS ENUM ('user', 'trainer', 'admin');

-- Добавляем таблицу ролей пользователей
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Включаем RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Создаем функцию для проверки ролей (security definer чтобы избежать рекурсии)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Создаем функцию для проверки является ли пользователь тренером
CREATE OR REPLACE FUNCTION public.is_trainer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('trainer', 'admin')
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND trainer_role = true
  )
$$;

-- Добавляем таблицу связей тренер-подопечный
CREATE TABLE public.trainer_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL,
    client_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true,
    UNIQUE (trainer_id, client_id)
);

-- Включаем RLS для trainer_clients
ALTER TABLE public.trainer_clients ENABLE ROW LEVEL SECURITY;

-- Политики для user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_trainer(auth.uid()));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Политики для trainer_clients
CREATE POLICY "Trainers can view their clients"
ON public.trainer_clients
FOR SELECT
USING (auth.uid() = trainer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Trainers can manage their clients"
ON public.trainer_clients
FOR ALL
USING (auth.uid() = trainer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their trainer assignments"
ON public.trainer_clients
FOR SELECT
USING (auth.uid() = client_id);

-- Обновляем политики целей чтобы тренеры могли управлять целями своих подопечных
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create goals" ON public.goals;

CREATE POLICY "Users can create their own goals"
ON public.goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.goals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Trainers can manage their clients goals"
ON public.goals
FOR ALL
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.trainer_clients 
    WHERE trainer_id = auth.uid() 
    AND client_id = goals.user_id 
    AND active = true
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Обновляем политики measurements для тренеров
CREATE POLICY "Trainers can view their clients measurements"
ON public.measurements
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.trainer_clients 
    WHERE trainer_id = auth.uid() 
    AND client_id = measurements.user_id 
    AND active = true
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Добавляем политики для health_records для тренеров
CREATE POLICY "Trainers can view their clients health records"
ON public.health_records
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.trainer_clients 
    WHERE trainer_id = auth.uid() 
    AND client_id = health_records.user_id 
    AND active = true
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Добавляем политики для daily_health_summary для тренеров
CREATE POLICY "Trainers can view their clients daily summaries"
ON public.daily_health_summary
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.trainer_clients 
    WHERE trainer_id = auth.uid() 
    AND client_id = daily_health_summary.user_id 
    AND active = true
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Создаем роли для существующих пользователей
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'trainer'::app_role
FROM public.profiles
WHERE trainer_role = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Триггер для автоматического создания роли 'user' для новых пользователей
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();