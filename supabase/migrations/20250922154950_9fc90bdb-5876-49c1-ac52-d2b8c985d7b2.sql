-- Удаляем дублированные челленджи, оставляя только самый первый
DELETE FROM challenges 
WHERE id IN ('c2d1dbaa-01de-473d-a09c-85811f1a1f9c', 'e7ee95d3-90a9-484f-a4a4-0c6de2cb963e');