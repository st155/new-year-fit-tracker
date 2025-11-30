-- Phase 1: Add aliases for EXISTING biomarkers

SELECT insert_biomarker_aliases('mchc', ARRAY[
  'MCHC', 'MCHC (g/L)', 'Mean Corpuscular Hemoglobin Concentration',
  'CCMH', 'Средняя концентрация гемоглобина', 'Концентрация гемоглобіну',
  'MCHC g/L', 'MCHC g/dL'
]);

SELECT insert_biomarker_aliases('rbc', ARRAY[
  'RED CELL COUNT', 'Red Blood Cell Count', 'RBC Count', 'Erythrocytes Count',
  'Эритроциты', 'Червоні кров''яні тільця', 'Eritrocitos', 'Nombre de globules rouges',
  'RBC x10^12/L', 'Red Cells', 'Erythrocyte Count'
]);

SELECT insert_biomarker_aliases('albumin', ARRAY[
  'Albumin | Serum', 'Serum Albumin', 'Albumin Blood', 'Альбумін',
  'Albumina sérica', 'Albumine sérique', 'ALB', 'Альбумин сыворотки',
  'Albumin g/L', 'Albumin g/dL'
]);

SELECT insert_biomarker_aliases('uric_acid', ARRAY[
  'Uric acid | Serum', 'Serum Uric Acid', 'Uric Acid Blood', 'Urate',
  'Мочевая кислота', 'Сечова кислота', 'Ácido úrico', 'Acide urique',
  'UA', 'Uric Acid µmol/L', 'Uric Acid mg/dL'
]);

SELECT insert_biomarker_aliases('alt', ARRAY[
  'ALT(SGPT) | Serum', 'ALT (SGPT)', 'SGPT', 'Alanine Aminotransferase',
  'АЛТ', 'Аланінамінотрансфераза', 'ALT U/L', 'ALAT',
  'GPT', 'Transaminase GPT', 'ALT Serum'
]);

SELECT insert_biomarker_aliases('ast', ARRAY[
  'AST(SGOT) | Serum', 'AST (SGOT)', 'SGOT', 'Aspartate Aminotransferase',
  'АСТ', 'Аспартатамінотрансфераза', 'AST U/L', 'ASAT',
  'GOT', 'Transaminase GOT', 'AST Serum'
]);

SELECT insert_biomarker_aliases('total_protein', ARRAY[
  'Total Protein | Serum', 'Serum Total Protein', 'Total Protein Blood',
  'Общий белок', 'Загальний білок', 'Proteínas totales', 'Protéines totales',
  'TP', 'Total Protein g/L', 'Total Protein g/dL'
]);

SELECT insert_biomarker_aliases('urea', ARRAY[
  'Urea | Serum', 'Blood Urea', 'Serum Urea', 'BUN',
  'Мочевина', 'Сечовина', 'Urée', 'Urea Blood',
  'Urea mmol/L', 'Urea mg/dL', 'Blood Urea Nitrogen'
]);

SELECT insert_biomarker_aliases('vitamin_b12', ARRAY[
  'Active B12', 'Active Vitamin B12', 'Holotranscobalamin', 'Holoтранскобаламин',
  'Active-B12', 'HoloTC', 'Active Cobalamin'
]);

-- Phase 2: Add NEW biomarkers to biomarker_master

INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges) VALUES
('calcium', 'Calcium', 'minerals', 'mmol/L', 'quantitative', 
  '{"adult_male": {"min": 2.15, "max": 2.55}, "adult_female": {"min": 2.15, "max": 2.55}}'::jsonb),
  
('phosphate', 'Phosphate', 'minerals', 'mmol/L', 'quantitative',
  '{"adult_male": {"min": 0.87, "max": 1.45}, "adult_female": {"min": 0.87, "max": 1.45}}'::jsonb),
  
('esr', 'ESR (Erythrocyte Sedimentation Rate)', 'inflammation', 'mm/h', 'quantitative',
  '{"adult_male": {"min": 0, "max": 15}, "adult_female": {"min": 0, "max": 20}}'::jsonb),
  
('mpv', 'Mean Platelet Volume', 'hematology', 'fL', 'quantitative',
  '{"adult_male": {"min": 7.5, "max": 11.5}, "adult_female": {"min": 7.5, "max": 11.5}}'::jsonb),
  
('alkaline_phosphatase', 'Alkaline Phosphatase (ALP)', 'liver', 'U/L', 'quantitative',
  '{"adult_male": {"min": 40, "max": 130}, "adult_female": {"min": 35, "max": 105}}'::jsonb),
  
('tibc', 'TIBC (Total Iron Binding Capacity)', 'iron', 'µmol/L', 'quantitative',
  '{"adult_male": {"min": 45, "max": 72}, "adult_female": {"min": 45, "max": 72}}'::jsonb),
  
('bicarbonate', 'Bicarbonate', 'electrolytes', 'mmol/L', 'quantitative',
  '{"adult_male": {"min": 22, "max": 29}, "adult_female": {"min": 22, "max": 29}}'::jsonb),
  
('transferrin_saturation', 'Transferrin Saturation', 'iron', '%', 'quantitative',
  '{"adult_male": {"min": 20, "max": 50}, "adult_female": {"min": 15, "max": 50}}'::jsonb),
  
('aso', 'ASO (Anti-Streptolysin O)', 'inflammation', 'IU/mL', 'quantitative',
  '{"adult_male": {"min": 0, "max": 200}, "adult_female": {"min": 0, "max": 200}}'::jsonb),
  
('chromium', 'Chromium', 'minerals', 'µg/L', 'quantitative',
  '{"adult_male": {"min": 0.1, "max": 2}, "adult_female": {"min": 0.1, "max": 2}}'::jsonb),
  
('copper', 'Copper', 'minerals', 'µmol/L', 'quantitative',
  '{"adult_male": {"min": 11, "max": 22}, "adult_female": {"min": 12.6, "max": 24.3}}'::jsonb),
  
('zinc', 'Zinc', 'minerals', 'µmol/L', 'quantitative',
  '{"adult_male": {"min": 10.7, "max": 17.5}, "adult_female": {"min": 10.7, "max": 17.5}}'::jsonb),
  
('bilirubin_indirect', 'Indirect Bilirubin', 'liver', 'µmol/L', 'quantitative',
  '{"adult_male": {"min": 0, "max": 17}, "adult_female": {"min": 0, "max": 17}}'::jsonb),
  
('creatine_kinase', 'Creatine Kinase (CK)', 'muscle', 'U/L', 'quantitative',
  '{"adult_male": {"min": 39, "max": 308}, "adult_female": {"min": 26, "max": 192}}'::jsonb),
  
('non_hdl_cholesterol', 'Non-HDL Cholesterol', 'lipids', 'mmol/L', 'quantitative',
  '{"adult_male": {"min": 0, "max": 3.37}, "adult_female": {"min": 0, "max": 3.37}}'::jsonb),
  
('folate', 'Folate (Folic Acid)', 'vitamins', 'nmol/L', 'quantitative',
  '{"adult_male": {"min": 8, "max": 45}, "adult_female": {"min": 8, "max": 45}}'::jsonb);

-- Phase 3: Add aliases for NEW biomarkers

SELECT insert_biomarker_aliases('calcium', ARRAY[
  'Calcium', 'Ca', 'Calcium | Serum', 'Serum Calcium', 'Calcium Blood',
  'Кальций', 'Кальцій', 'Calcio', 'Calcium sérique',
  'Ca++', 'Calcium mmol/L', 'Calcium mg/dL', 'Total Calcium'
]);

SELECT insert_biomarker_aliases('phosphate', ARRAY[
  'Phosphate', 'Phosphorus', 'P', 'Phosphate | Serum', 'Inorganic Phosphate',
  'Фосфор', 'Фосфат', 'Fosfato', 'Phosphate sérique',
  'PO4', 'Phosphate mmol/L', 'Phosphate mg/dL', 'Phosphorus Blood'
]);

SELECT insert_biomarker_aliases('esr', ARRAY[
  'ESR', 'Erythrocyte Sedimentation Rate', 'Sed Rate', 'СОЭ',
  'ШОЕ', 'Швидкість осідання еритроцитів', 'VSG', 'Vitesse de sédimentation',
  'ESR mm/h', 'Sedimentation Rate', 'Westergren ESR'
]);

SELECT insert_biomarker_aliases('mpv', ARRAY[
  'MPV', 'Mean Platelet Volume', 'Средний объем тромбоцитов',
  'Середній об''єм тромбоцитів', 'Volume plaquettaire moyen',
  'MPV fL', 'Mean Plt Volume', 'Platelet Volume'
]);

SELECT insert_biomarker_aliases('alkaline_phosphatase', ARRAY[
  'Alkaline Phosphatase', 'ALP', 'Alk Phos', 'Щелочная фосфатаза',
  'Лужна фосфатаза', 'Fosfatasa alcalina', 'Phosphatase alcaline',
  'ALP U/L', 'ALKP', 'Alk Phosphatase'
]);

SELECT insert_biomarker_aliases('tibc', ARRAY[
  'TIBC', 'Total Iron Binding Capacity', 'Iron Binding Capacity',
  'ОЖСС', 'ОЗСЗ', 'Загальна залізозв''язуюча здатність',
  'Capacidad de fijación del hierro', 'TIBC µmol/L', 'TIBC µg/dL'
]);

SELECT insert_biomarker_aliases('bicarbonate', ARRAY[
  'Bicarbonate', 'HCO3', 'CO2', 'Total CO2', 'Бикарбонат',
  'Гідрокарбонат', 'Bicarbonato', 'Bicarbonate sérique',
  'HCO3-', 'Bicarbonate mmol/L', 'Carbon Dioxide'
]);

SELECT insert_biomarker_aliases('transferrin_saturation', ARRAY[
  'Transferrin Saturation', 'TSAT', 'Iron Saturation', 'Transferrin Sat',
  'Насыщение трансферрина', 'Насичення трансферину',
  'Saturación de transferrina', 'TSAT %', 'Iron Sat %'
]);

SELECT insert_biomarker_aliases('aso', ARRAY[
  'ASO', 'Anti-Streptolysin O', 'ASLO', 'Antistreptolysin O',
  'АСЛ-О', 'Антистрептолізин О', 'Antistreptolisina O',
  'ASO IU/mL', 'ASLO Titer', 'Streptolysin Antibody'
]);

SELECT insert_biomarker_aliases('chromium', ARRAY[
  'Chromium', 'Cr', 'Chromium | Serum', 'Serum Chromium',
  'Хром', 'Cromo', 'Chrome',
  'Cr µg/L', 'Chromium Blood', 'Chromium Level'
]);

SELECT insert_biomarker_aliases('copper', ARRAY[
  'Copper', 'Cu', 'Copper | Serum', 'Serum Copper',
  'Медь', 'Мідь', 'Cobre', 'Cuivre',
  'Cu µmol/L', 'Copper µg/dL', 'Copper Blood'
]);

SELECT insert_biomarker_aliases('zinc', ARRAY[
  'Zinc', 'Zn', 'Zinc | Serum', 'Serum Zinc',
  'Цинк', 'Цинк', 'Cinc', 'Zinc sérique',
  'Zn µmol/L', 'Zinc µg/dL', 'Zinc Blood'
]);

SELECT insert_biomarker_aliases('bilirubin_indirect', ARRAY[
  'Indirect Bilirubin', 'Unconjugated Bilirubin', 'Indirect Bili',
  'Непрямой билирубин', 'Непрямий білірубін', 'Bilirrubina indirecta',
  'Bilirubine indirecte', 'Indirect Bill', 'Unconjugated Bill'
]);

SELECT insert_biomarker_aliases('creatine_kinase', ARRAY[
  'Creatine Kinase', 'CK', 'CPK', 'Creatine Kinase (CK) | Serum',
  'Креатинкиназа', 'Креатинкіназа', 'Creatina quinasa', 'Créatine kinase',
  'CK U/L', 'CPK U/L', 'Creatine Phosphokinase'
]);

SELECT insert_biomarker_aliases('non_hdl_cholesterol', ARRAY[
  'Non-HDL Cholesterol', 'Non-HDL Chol', 'Non HDL',
  'Не-HDL холестерин', 'Не-HDL холестерол', 'Colesterol no HDL',
  'Non-HDL-C', 'Cholesterol Non-HDL', 'Non-HDL mmol/L'
]);

SELECT insert_biomarker_aliases('folate', ARRAY[
  'Folate', 'Folic Acid', 'Vitamin B9', 'Folate | Serum',
  'Фолиевая кислота', 'Фолієва кислота', 'Ácido fólico', 'Acide folique',
  'Folate nmol/L', 'Folate ng/mL', 'Serum Folate'
]);

-- Phase 4: Rematch all unmatched lab results

UPDATE lab_test_results ltr
SET biomarker_id = ba.biomarker_id
FROM biomarker_aliases ba
WHERE ltr.biomarker_id IS NULL
  AND LOWER(REGEXP_REPLACE(ltr.raw_test_name, '[^a-zA-Z0-9]', '', 'g')) = ba.alias_normalized;