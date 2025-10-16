-- Update challenge name to "New Year Chocolate"
UPDATE public.challenges 
SET title = 'New Year Chocolate',
    description = 'Челлендж на новогодний рельеф: 9 ключевых показателей для достижения идеальной формы'
WHERE title = 'New Year Challenge';

-- Update the default goals function with new 9 metrics
CREATE OR REPLACE FUNCTION public.create_challenge_goals_for_participant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_goals jsonb[] := ARRAY[
    '{"name": "Бег 1 км", "type": "cardio", "value": 4.0, "unit": "мин"}',
    '{"name": "Подтягивания", "type": "strength", "value": 17, "unit": "раз"}',
    '{"name": "Жим лёжа", "type": "strength", "value": 100, "unit": "кг×1"}',
    '{"name": "Выпады назад со штангой", "type": "strength", "value": 60, "unit": "кг×8"}',
    '{"name": "Планка", "type": "endurance", "value": 6, "unit": "мин"}',
    '{"name": "Отжимания", "type": "strength", "value": 70, "unit": "раз"}',
    '{"name": "Подъём ног в висе до перекладины", "type": "strength", "value": 20, "unit": "раз"}',
    '{"name": "VO₂max", "type": "health", "value": 55, "unit": "мл/кг/мин"}',
    '{"name": "Процент жира", "type": "body_composition", "value": 12, "unit": "%"}'
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
$function$;