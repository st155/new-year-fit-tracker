-- Удаляем WHOOP токены для Pavel Radaev и Alexey Gubarev
-- Это позволит им переподключиться заново через Terra Widget
DELETE FROM terra_tokens 
WHERE id IN (
  'a2f4b547-76fc-4c06-b4e8-1687e3e30a54',  -- Pavel Radaev WHOOP
  '48586c3c-9115-445e-be95-2cdff83851da'   -- Alexey Gubarev WHOOP
);