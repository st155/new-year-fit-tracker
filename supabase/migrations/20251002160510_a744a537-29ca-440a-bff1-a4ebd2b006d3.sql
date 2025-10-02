-- Update challenge titles and descriptions to English
UPDATE challenges
SET 
  title = 'New Year Six-Pack Challenge',
  description = 'Personal challenge to achieve top 10% physical fitness among men. Includes strength metrics, endurance, and body composition.'
WHERE title = 'Кубики к Новому Году';
