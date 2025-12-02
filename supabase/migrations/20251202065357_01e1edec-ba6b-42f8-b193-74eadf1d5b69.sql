-- Fix incorrect date parsing for InBody analysis
-- Change 2025-02-12 to 2025-12-02 (European date format DD.MM.YYYY was misinterpreted)
UPDATE inbody_analyses 
SET test_date = '2025-12-02 08:10:00+00'
WHERE id = '19bb50ad-9908-4e8e-893f-7e1b5faf0ae8';