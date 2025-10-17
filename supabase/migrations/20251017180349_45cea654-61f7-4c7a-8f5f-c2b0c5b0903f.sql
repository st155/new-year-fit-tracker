-- 1. Создать таблицу challenge_trainers для связи тренеров и челленджей
CREATE TABLE IF NOT EXISTS public.challenge_trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID NOT NULL,
  role TEXT DEFAULT 'coach',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, trainer_id)
);

-- Включить RLS
ALTER TABLE public.challenge_trainers ENABLE ROW LEVEL SECURITY;

-- RLS политики для challenge_trainers
CREATE POLICY "Challenge trainers can view their challenges"
ON public.challenge_trainers FOR SELECT
USING (trainer_id = auth.uid());

CREATE POLICY "Challenge owners can manage trainers"
ON public.challenge_trainers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_trainers.challenge_id
    AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_trainers.challenge_id
    AND c.created_by = auth.uid()
  )
);

-- 2. Функция проверки: является ли пользователь тренером челленджа
CREATE OR REPLACE FUNCTION public.is_challenge_trainer(_user_id UUID, _challenge_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenges WHERE id = _challenge_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.challenge_trainers 
    WHERE challenge_id = _challenge_id AND trainer_id = _user_id
  )
$$;

-- 3. Обновить RLS для goals: тренеры челленджей могут управлять целями участников
CREATE POLICY "Challenge trainers can manage participant goals"
ON public.goals FOR ALL
USING (
  challenge_id IS NOT NULL 
  AND is_personal = false 
  AND public.is_challenge_trainer(auth.uid(), challenge_id)
)
WITH CHECK (
  challenge_id IS NOT NULL
  AND is_personal = false
  AND public.is_challenge_trainer(auth.uid(), challenge_id)
);

-- 4. Обновить RLS для measurements: тренеры могут видеть и добавлять замеры
CREATE POLICY "Challenge trainers can view participant measurements"
ON public.measurements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = measurements.goal_id
    AND g.challenge_id IS NOT NULL
    AND g.is_personal = false
    AND public.is_challenge_trainer(auth.uid(), g.challenge_id)
  )
);

CREATE POLICY "Challenge trainers can add measurements for participants"
ON public.measurements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = measurements.goal_id
    AND g.challenge_id IS NOT NULL
    AND g.is_personal = false
    AND public.is_challenge_trainer(auth.uid(), g.challenge_id)
  )
);

-- 5. Триггер: автоматически добавлять участников челленджа к тренерам
CREATE OR REPLACE FUNCTION public.auto_assign_challenge_participant_to_trainers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trainer_record RECORD;
BEGIN
  -- Добавляем участника ко всем тренерам челленджа
  FOR trainer_record IN 
    SELECT trainer_id FROM public.challenge_trainers WHERE challenge_id = NEW.challenge_id
    UNION
    SELECT created_by FROM public.challenges WHERE id = NEW.challenge_id
  LOOP
    INSERT INTO public.trainer_clients (trainer_id, client_id, active)
    VALUES (trainer_record.trainer_id, NEW.user_id, true)
    ON CONFLICT (trainer_id, client_id) DO UPDATE
    SET active = true;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_challenge_participant_added
AFTER INSERT ON public.challenge_participants
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_challenge_participant_to_trainers();

-- 6. Миграция существующих данных: добавить создателей челленджей в challenge_trainers
INSERT INTO public.challenge_trainers (challenge_id, trainer_id, role)
SELECT id, created_by, 'owner'
FROM public.challenges
ON CONFLICT (challenge_id, trainer_id) DO NOTHING;

-- 7. Миграция существующих участников в trainer_clients
INSERT INTO public.trainer_clients (trainer_id, client_id, active)
SELECT c.created_by, cp.user_id, true
FROM public.challenge_participants cp
JOIN public.challenges c ON c.id = cp.challenge_id
ON CONFLICT (trainer_id, client_id) DO UPDATE SET active = true;