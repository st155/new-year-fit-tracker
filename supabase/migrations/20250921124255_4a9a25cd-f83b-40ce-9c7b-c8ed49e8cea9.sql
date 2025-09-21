-- Удаляем все данные пользователей из публичных таблиц
-- Это безопасно, так как все таблицы имеют каскадные удаления или ссылки на auth.users

-- Удаляем все профили
DELETE FROM public.profiles;

-- Удаляем все цели
DELETE FROM public.goals;

-- Удаляем все измерения  
DELETE FROM public.measurements;

-- Удаляем все данные о составе тела
DELETE FROM public.body_composition;

-- Удаляем всех участников челленджей
DELETE FROM public.challenge_participants;

-- Удаляем все челленджи
DELETE FROM public.challenges;

-- Удаляем все токены Whoop
DELETE FROM public.whoop_tokens;

-- Удаляем все метрики пользователей
DELETE FROM public.user_metrics;

-- Удаляем все значения метрик
DELETE FROM public.metric_values;