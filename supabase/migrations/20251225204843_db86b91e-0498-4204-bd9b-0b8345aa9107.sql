-- Очистка устаревших target_unit: 'кг×1' → 'кг' + target_reps: 1
UPDATE public.goals
SET target_unit = 'кг', target_reps = 1
WHERE target_unit LIKE '%кг×1%' OR target_unit LIKE '%кг x 1%';

-- Очистка устаревших target_unit: 'кг×8' → 'кг' + target_reps: 8
UPDATE public.goals
SET target_unit = 'кг', target_reps = 8
WHERE target_unit LIKE '%кг×8%' OR target_unit LIKE '%кг x 8%';

-- Установить target_reps = 1 для силовых целей с '1RM' или '1рм' в названии
UPDATE public.goals
SET target_reps = 1
WHERE target_reps IS NULL 
  AND (goal_name ILIKE '%1RM%' OR goal_name ILIKE '%1рм%' OR goal_name ILIKE '%жим%')
  AND (target_unit = 'кг' OR target_unit = 'kg');

-- Очистка 'кгx' вариантов
UPDATE public.goals
SET target_unit = 'кг'
WHERE target_unit LIKE 'кг%×%' OR target_unit LIKE 'кг%x%';