-- Step 1: Drop constraint first to allow any value temporarily
ALTER TABLE medical_documents 
DROP CONSTRAINT IF EXISTS medical_documents_category_check;

-- Step 2: Handle NULL categories
UPDATE medical_documents 
SET category = 'other' 
WHERE category IS NULL;

-- Step 3: Update lab_blood to blood_test
UPDATE medical_documents 
SET category = 'blood_test' 
WHERE category = 'lab_blood';

-- Step 4: Add new expanded constraint
ALTER TABLE medical_documents
ADD CONSTRAINT medical_documents_category_check 
CHECK (category = ANY (ARRAY[
  'blood_test', 'lab_urine', 'lab_microbiome',
  'imaging_report', 'inbody', 'vo2max', 'fitness_report', 'caliper',
  'clinical_note', 'prescription', 'training_program', 'progress_photo',
  'other'
]::text[]));