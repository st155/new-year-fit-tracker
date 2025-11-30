
-- Add missing biomarkers to biomarker_master table
-- This fixes 62% unmatched lab test results

-- Erythrocyte Indices
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges, description)
VALUES
  ('rbc', 'Red Blood Cells', 'blood_count', 'T/L', 'quantitative', 
   '{"male": {"18-99": {"min": 4.5, "max": 5.5, "optimal_min": 4.7, "optimal_max": 5.3}}, "female": {"18-99": {"min": 4.0, "max": 5.0, "optimal_min": 4.2, "optimal_max": 4.8}}}'::jsonb,
   'Number of red blood cells, oxygen carriers in blood'),
   
  ('hematocrit', 'Hematocrit', 'blood_count', '%', 'quantitative',
   '{"male": {"18-99": {"min": 40, "max": 54, "optimal_min": 42, "optimal_max": 52}}, "female": {"18-99": {"min": 36, "max": 48, "optimal_min": 38, "optimal_max": 46}}}'::jsonb,
   'Percentage of blood volume occupied by red blood cells'),
   
  ('mcv', 'Mean Corpuscular Volume', 'blood_count', 'fL', 'quantitative',
   '{"male": {"18-99": {"min": 80, "max": 100, "optimal_min": 85, "optimal_max": 95}}, "female": {"18-99": {"min": 80, "max": 100, "optimal_min": 85, "optimal_max": 95}}}'::jsonb,
   'Average volume of red blood cells'),
   
  ('mch', 'Mean Corpuscular Hemoglobin', 'blood_count', 'pg', 'quantitative',
   '{"male": {"18-99": {"min": 27, "max": 33, "optimal_min": 28, "optimal_max": 32}}, "female": {"18-99": {"min": 27, "max": 33, "optimal_min": 28, "optimal_max": 32}}}'::jsonb,
   'Average amount of hemoglobin per red blood cell'),
   
  ('mchc', 'Mean Corpuscular Hemoglobin Concentration', 'blood_count', 'g/L', 'quantitative',
   '{"male": {"18-99": {"min": 320, "max": 360, "optimal_min": 330, "optimal_max": 350}}, "female": {"18-99": {"min": 320, "max": 360, "optimal_min": 330, "optimal_max": 350}}}'::jsonb,
   'Average concentration of hemoglobin in red blood cells'),
   
  ('platelets', 'Platelets', 'blood_count', 'G/L', 'quantitative',
   '{"male": {"18-99": {"min": 150, "max": 400, "optimal_min": 200, "optimal_max": 350}}, "female": {"18-99": {"min": 150, "max": 400, "optimal_min": 200, "optimal_max": 350}}}'::jsonb,
   'Blood cells responsible for clotting');

-- Leukocyte Formula
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges, description)
VALUES
  ('neutrophils', 'Neutrophils', 'blood_count', '%', 'quantitative',
   '{"male": {"18-99": {"min": 40, "max": 70, "optimal_min": 45, "optimal_max": 65}}, "female": {"18-99": {"min": 40, "max": 70, "optimal_min": 45, "optimal_max": 65}}}'::jsonb,
   'Most abundant white blood cells, first responders to infection'),
   
  ('lymphocytes', 'Lymphocytes', 'blood_count', '%', 'quantitative',
   '{"male": {"18-99": {"min": 20, "max": 45, "optimal_min": 25, "optimal_max": 40}}, "female": {"18-99": {"min": 20, "max": 45, "optimal_min": 25, "optimal_max": 40}}}'::jsonb,
   'White blood cells involved in immune response'),
   
  ('monocytes', 'Monocytes', 'blood_count', '%', 'quantitative',
   '{"male": {"18-99": {"min": 2, "max": 10, "optimal_min": 3, "optimal_max": 8}}, "female": {"18-99": {"min": 2, "max": 10, "optimal_min": 3, "optimal_max": 8}}}'::jsonb,
   'White blood cells that develop into macrophages'),
   
  ('eosinophils', 'Eosinophils', 'blood_count', '%', 'quantitative',
   '{"male": {"18-99": {"min": 0, "max": 5, "optimal_min": 1, "optimal_max": 4}}, "female": {"18-99": {"min": 0, "max": 5, "optimal_min": 1, "optimal_max": 4}}}'::jsonb,
   'White blood cells involved in allergic reactions and parasite defense'),
   
  ('basophils', 'Basophils', 'blood_count', '%', 'quantitative',
   '{"male": {"18-99": {"min": 0, "max": 2, "optimal_min": 0, "optimal_max": 1}}, "female": {"18-99": {"min": 0, "max": 2, "optimal_min": 0, "optimal_max": 1}}}'::jsonb,
   'Least common white blood cells involved in allergic reactions');

-- Liver Function
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges, description)
VALUES
  ('bilirubin_total', 'Total Bilirubin', 'liver_function', 'µmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 5, "max": 21, "optimal_min": 7, "optimal_max": 17}}, "female": {"18-99": {"min": 5, "max": 21, "optimal_min": 7, "optimal_max": 17}}}'::jsonb,
   'Breakdown product of red blood cells, elevated in liver dysfunction'),
   
  ('bilirubin_direct', 'Direct Bilirubin', 'liver_function', 'µmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 0, "max": 5, "optimal_min": 0, "optimal_max": 3}}, "female": {"18-99": {"min": 0, "max": 5, "optimal_min": 0, "optimal_max": 3}}}'::jsonb,
   'Conjugated bilirubin processed by liver'),
   
  ('ldh', 'Lactate Dehydrogenase', 'liver_function', 'U/L', 'quantitative',
   '{"male": {"18-99": {"min": 120, "max": 250, "optimal_min": 140, "optimal_max": 220}}, "female": {"18-99": {"min": 120, "max": 250, "optimal_min": 140, "optimal_max": 220}}}'::jsonb,
   'Enzyme involved in energy production, elevated in tissue damage'),
   
  ('total_protein', 'Total Protein', 'liver_function', 'g/L', 'quantitative',
   '{"male": {"18-99": {"min": 60, "max": 80, "optimal_min": 65, "optimal_max": 75}}, "female": {"18-99": {"min": 60, "max": 80, "optimal_min": 65, "optimal_max": 75}}}'::jsonb,
   'Total amount of protein in blood'),
   
  ('albumin', 'Albumin', 'liver_function', 'g/L', 'quantitative',
   '{"male": {"18-99": {"min": 35, "max": 50, "optimal_min": 40, "optimal_max": 48}}, "female": {"18-99": {"min": 35, "max": 50, "optimal_min": 40, "optimal_max": 48}}}'::jsonb,
   'Main protein in blood, produced by liver'),
   
  ('globulin', 'Globulin', 'liver_function', 'g/L', 'quantitative',
   '{"male": {"18-99": {"min": 20, "max": 35, "optimal_min": 23, "optimal_max": 32}}, "female": {"18-99": {"min": 20, "max": 35, "optimal_min": 23, "optimal_max": 32}}}'::jsonb,
   'Group of proteins including antibodies');

-- Metabolic & Cardiovascular
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges, description)
VALUES
  ('insulin_fasting', 'Fasting Insulin', 'metabolic', 'µIU/mL', 'quantitative',
   '{"male": {"18-99": {"min": 2, "max": 25, "optimal_min": 3, "optimal_max": 10}}, "female": {"18-99": {"min": 2, "max": 25, "optimal_min": 3, "optimal_max": 10}}}'::jsonb,
   'Insulin level after fasting, marker of insulin sensitivity'),
   
  ('homocysteine', 'Homocysteine', 'cardiovascular', 'µmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 5, "max": 15, "optimal_min": 6, "optimal_max": 10}}, "female": {"18-99": {"min": 5, "max": 15, "optimal_min": 6, "optimal_max": 10}}}'::jsonb,
   'Amino acid associated with cardiovascular disease risk');

-- Electrolytes
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges, description)
VALUES
  ('sodium', 'Sodium', 'electrolytes', 'mmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 136, "max": 145, "optimal_min": 138, "optimal_max": 143}}, "female": {"18-99": {"min": 136, "max": 145, "optimal_min": 138, "optimal_max": 143}}}'::jsonb,
   'Main electrolyte in blood, regulates fluid balance'),
   
  ('potassium', 'Potassium', 'electrolytes', 'mmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 3.5, "max": 5.1, "optimal_min": 3.8, "optimal_max": 4.8}}, "female": {"18-99": {"min": 3.5, "max": 5.1, "optimal_min": 3.8, "optimal_max": 4.8}}}'::jsonb,
   'Essential electrolyte for heart and muscle function'),
   
  ('chloride', 'Chloride', 'electrolytes', 'mmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 98, "max": 107, "optimal_min": 100, "optimal_max": 105}}, "female": {"18-99": {"min": 98, "max": 107, "optimal_min": 100, "optimal_max": 105}}}'::jsonb,
   'Electrolyte that helps maintain fluid balance');

-- Thyroid
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges, description)
VALUES
  ('free_t4', 'Free T4 (Thyroxine)', 'thyroid', 'pmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 10, "max": 23, "optimal_min": 12, "optimal_max": 20}}, "female": {"18-99": {"min": 10, "max": 23, "optimal_min": 12, "optimal_max": 20}}}'::jsonb,
   'Unbound thyroid hormone, regulates metabolism'),
   
  ('free_t3', 'Free T3 (Triiodothyronine)', 'thyroid', 'pmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 3.5, "max": 6.5, "optimal_min": 4.0, "optimal_max": 6.0}}, "female": {"18-99": {"min": 3.5, "max": 6.5, "optimal_min": 4.0, "optimal_max": 6.0}}}'::jsonb,
   'Active thyroid hormone');

-- Kidney Function
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges, description)
VALUES
  ('urea', 'Urea', 'kidney_function', 'mmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 2.5, "max": 7.1, "optimal_min": 3.0, "optimal_max": 6.5}}, "female": {"18-99": {"min": 2.5, "max": 7.1, "optimal_min": 3.0, "optimal_max": 6.5}}}'::jsonb,
   'Waste product filtered by kidneys'),
   
  ('uric_acid', 'Uric Acid', 'kidney_function', 'µmol/L', 'quantitative',
   '{"male": {"18-99": {"min": 200, "max": 420, "optimal_min": 250, "optimal_max": 380}}, "female": {"18-99": {"min": 140, "max": 360, "optimal_min": 180, "optimal_max": 320}}}'::jsonb,
   'Breakdown product of purines, elevated in gout');
