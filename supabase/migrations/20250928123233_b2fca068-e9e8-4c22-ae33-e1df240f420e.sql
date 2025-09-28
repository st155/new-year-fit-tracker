-- Создаем базовые цели челленджа для всех участников
INSERT INTO public.goals (user_id, challenge_id, goal_name, goal_type, target_value, target_unit, is_personal) VALUES
-- Цели для Pavel Radaev (932aab9d-a104-4ba2-885f-2dfdc5dd5df2)
('932aab9d-a104-4ba2-885f-2dfdc5dd5df2', 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', 'Подтягивания', 'strength', 17, 'раз', false),
('932aab9d-a104-4ba2-885f-2dfdc5dd5df2', 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', 'Жим лёжа', 'strength', 90, 'кг', false),
('932aab9d-a104-4ba2-885f-2dfdc5dd5df2', 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', 'Выпады назад со штангой', 'strength', 50, 'кг×8', false),
('932aab9d-a104-4ba2-885f-2dfdc5dd5df2', 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', 'Планка', 'endurance', 4, 'мин', false),
('932aab9d-a104-4ba2-885f-2dfdc5dd5df2', 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', 'Отжимания', 'strength', 60, 'раз', false),
('932aab9d-a104-4ba2-885f-2dfdc5dd5df2', 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', 'VO₂max', 'health', 50, 'мл/кг/мин', false),
('932aab9d-a104-4ba2-885f-2dfdc5dd5df2', 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', 'Бег 1 км', 'cardio', 4.0, 'мин', false),
('932aab9d-a104-4ba2-885f-2dfdc5dd5df2', 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', 'Процент жира', 'body_composition', 11, '%', false);

-- Обновляем существующие личные цели создателя челленджа, чтобы они тоже были связаны с челленджем
UPDATE public.goals 
SET challenge_id = 'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', is_personal = false
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818' 
AND is_personal = true
AND goal_name IN ('Подтягивания', 'Жим лёжа', 'Выпады назад со штангой', 'Планка', 'Отжимания', 'VO₂max', 'Бег 1 км', 'Процент жира');

-- Создаем функцию для автоматического создания целей при присоединении к челленджу
CREATE OR REPLACE FUNCTION public.create_challenge_goals_for_participant()
RETURNS TRIGGER AS $$
DECLARE
  default_goals jsonb[] := ARRAY[
    '{"name": "Подтягивания", "type": "strength", "value": 17, "unit": "раз"}',
    '{"name": "Жим лёжа", "type": "strength", "value": 90, "unit": "кг"}',
    '{"name": "Выпады назад со штангой", "type": "strength", "value": 50, "unit": "кг×8"}',
    '{"name": "Планка", "type": "endurance", "value": 4, "unit": "мин"}',
    '{"name": "Отжимания", "type": "strength", "value": 60, "unit": "раз"}',
    '{"name": "VO₂max", "type": "health", "value": 50, "unit": "мл/кг/мин"}',
    '{"name": "Бег 1 км", "type": "cardio", "value": 4.0, "unit": "мин"}',
    '{"name": "Процент жира", "type": "body_composition", "value": 11, "unit": "%"}'
  ];
  goal_data jsonb;
BEGIN
  -- Проверяем, есть ли уже цели у участника для данного челленджа
  IF NOT EXISTS (
    SELECT 1 FROM public.goals 
    WHERE user_id = NEW.user_id 
    AND challenge_id = NEW.challenge_id
  ) THEN
    -- Создаем стандартные цели челленджа для нового участника
    FOREACH goal_data IN ARRAY default_goals
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
        goal_data->>'name',
        goal_data->>'type',
        (goal_data->>'value')::numeric,
        goal_data->>'unit',
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер для автоматического создания целей при присоединении к челленджу
CREATE TRIGGER on_challenge_participant_created
  AFTER INSERT ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.create_challenge_goals_for_participant();