-- Update stuck InBody documents that already have analyses
UPDATE medical_documents md
SET 
  processing_status = 'completed',
  processing_completed_at = now(),
  ai_summary = ia.ai_summary,
  ai_extracted_data = jsonb_build_object(
    'inbody_analysis_id', ia.id,
    'test_date', ia.test_date,
    'weight', ia.weight,
    'skeletal_muscle_mass', ia.skeletal_muscle_mass,
    'percent_body_fat', ia.percent_body_fat,
    'visceral_fat_area', ia.visceral_fat_area
  )
FROM inbody_analyses ia
WHERE ia.document_id = md.id
  AND md.processing_status = 'processing';