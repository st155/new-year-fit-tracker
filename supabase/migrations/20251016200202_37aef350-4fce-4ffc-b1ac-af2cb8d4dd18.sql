-- Create challenge_disciplines table
CREATE TABLE public.challenge_disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  discipline_name TEXT NOT NULL,
  discipline_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  benchmark_value NUMERIC,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_challenge_disciplines_challenge_id ON public.challenge_disciplines(challenge_id);

ALTER TABLE public.challenge_disciplines ENABLE ROW LEVEL SECURITY;

-- RLS: Participants can view challenge disciplines
CREATE POLICY "Participants can view challenge disciplines"
ON public.challenge_disciplines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_disciplines.challenge_id
    AND cp.user_id = auth.uid()
  )
);

-- RLS: Trainers can manage their challenge disciplines
CREATE POLICY "Trainers can manage their challenge disciplines"
ON public.challenge_disciplines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_disciplines.challenge_id
    AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_disciplines.challenge_id
    AND c.created_by = auth.uid()
  )
);

-- Update trigger to create goals from disciplines
CREATE OR REPLACE FUNCTION public.create_challenge_goals_for_participant()
RETURNS TRIGGER AS $$
DECLARE
  discipline_record RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.goals 
    WHERE user_id = NEW.user_id 
    AND challenge_id = NEW.challenge_id
  ) THEN
    FOR discipline_record IN 
      SELECT * FROM public.challenge_disciplines
      WHERE challenge_id = NEW.challenge_id
      ORDER BY position ASC
    LOOP
      INSERT INTO public.goals (
        user_id, 
        challenge_id, 
        goal_name, 
        goal_type, 
        target_value,
        target_unit, 
        is_personal
      ) VALUES (
        NEW.user_id,
        NEW.challenge_id,
        discipline_record.discipline_name,
        discipline_record.discipline_type,
        discipline_record.benchmark_value,
        discipline_record.unit,
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Populate disciplines for existing challenges
INSERT INTO public.challenge_disciplines (challenge_id, discipline_name, discipline_type, unit, benchmark_value, position)
SELECT 
  c.id,
  d.discipline_name::TEXT,
  d.discipline_type::TEXT,
  d.unit::TEXT,
  d.benchmark_value::NUMERIC,
  d.position::INTEGER
FROM challenges c
CROSS JOIN (VALUES
  ('Бег 1 км', 'cardio', 'мин', NULL::NUMERIC, 1),
  ('Подтягивания', 'strength', 'раз', NULL::NUMERIC, 2),
  ('Жим лёжа', 'strength', 'кг×1', NULL::NUMERIC, 3),
  ('Выпады назад со штангой', 'strength', 'кг×8', NULL::NUMERIC, 4),
  ('Планка', 'endurance', 'мин', NULL::NUMERIC, 5),
  ('Отжимания', 'strength', 'раз', NULL::NUMERIC, 6),
  ('Подъём ног в висе до перекладины', 'strength', 'раз', NULL::NUMERIC, 7),
  ('VO₂max', 'health', 'мл/кг/мин', NULL::NUMERIC, 8),
  ('Процент жира', 'body_composition', '%', NULL::NUMERIC, 9)
) AS d(discipline_name, discipline_type, unit, benchmark_value, position)
WHERE c.is_active = true;