-- Change the default value of category column from 'lab_blood' to 'other'
ALTER TABLE medical_documents 
ALTER COLUMN category SET DEFAULT 'other';