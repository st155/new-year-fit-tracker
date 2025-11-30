
-- Add comprehensive aliases for newly added biomarkers
-- English, French, Ukrainian, Russian variants

-- RBC (Red Blood Cells)
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized) 
SELECT id, unnest(ARRAY[
  'RBC', 'Red Blood Cells', 'Erythrocytes', 'Red Cells', 'RBCs',
  'Globules Rouges', 'Érythrocytes', 'GR',
  'Эритроциты', 'Красные кровяные тельца', 'ККТ',
  'Еритроцити', 'Червоні кров''яні тільця'
]), normalize_biomarker_name(unnest(ARRAY[
  'RBC', 'Red Blood Cells', 'Erythrocytes', 'Red Cells', 'RBCs',
  'Globules Rouges', 'Érythrocytes', 'GR',
  'Эритроциты', 'Красные кровяные тельца', 'ККТ',
  'Еритроцити', 'Червоні кров''яні тільця'
]))
FROM biomarker_master WHERE canonical_name = 'rbc'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Hematocrit
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Hematocrit', 'HCT', 'Hct', 'Packed Cell Volume', 'PCV',
  'Hématocrite', 'Ht',
  'Гематокрит', 'Ht', 'Гем',
  'Гематокрит'
]), normalize_biomarker_name(unnest(ARRAY[
  'Hematocrit', 'HCT', 'Hct', 'Packed Cell Volume', 'PCV',
  'Hématocrite', 'Ht',
  'Гематокрит', 'Ht', 'Гем',
  'Гематокрит'
]))
FROM biomarker_master WHERE canonical_name = 'hematocrit'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- MCV
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'MCV', 'Mean Corpuscular Volume', 'Mean Cell Volume', 'Ery-MCV',
  'VGM', 'Volume Globulaire Moyen',
  'Средний объем эритроцита', 'СОЭ', 'MCV',
  'Середній об''єм еритроцита', 'СОЕ'
]), normalize_biomarker_name(unnest(ARRAY[
  'MCV', 'Mean Corpuscular Volume', 'Mean Cell Volume', 'Ery-MCV',
  'VGM', 'Volume Globulaire Moyen',
  'Средний объем эритроцита', 'СОЭ', 'MCV',
  'Середній об''єм еритроцита', 'СОЕ'
]))
FROM biomarker_master WHERE canonical_name = 'mcv'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- MCH
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'MCH', 'Mean Corpuscular Hemoglobin', 'Mean Cell Hemoglobin', 'Ery-MCH',
  'TCMH', 'Teneur Corpusculaire Moyenne en Hémoglobine',
  'Среднее содержание гемоглобина', 'ССГ', 'MCH',
  'Середній вміст гемоглобіну'
]), normalize_biomarker_name(unnest(ARRAY[
  'MCH', 'Mean Corpuscular Hemoglobin', 'Mean Cell Hemoglobin', 'Ery-MCH',
  'TCMH', 'Teneur Corpusculaire Moyenne en Hémoglobine',
  'Среднее содержание гемоглобина', 'ССГ', 'MCH',
  'Середній вміст гемоглобіну'
]))
FROM biomarker_master WHERE canonical_name = 'mch'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- MCHC
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'MCHC', 'Mean Corpuscular Hemoglobin Concentration', 'Mean Cell Hb Conc', 'Ery-MCHC',
  'CCMH', 'Concentration Corpusculaire Moyenne en Hémoglobine',
  'Средняя концентрация гемоглобина', 'СКГЭ', 'МСНС',
  'Середня концентрація гемоглобіну'
]), normalize_biomarker_name(unnest(ARRAY[
  'MCHC', 'Mean Corpuscular Hemoglobin Concentration', 'Mean Cell Hb Conc', 'Ery-MCHC',
  'CCMH', 'Concentration Corpusculaire Moyenne en Hémoglobine',
  'Средняя концентрация гемоглобина', 'СКГЭ', 'МСНС',
  'Середня концентрація гемоглобіну'
]))
FROM biomarker_master WHERE canonical_name = 'mchc'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Platelets
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Platelets', 'PLT', 'Thrombocytes', 'Platelet Count',
  'Plaquettes', 'Thrombocytes', 'Numération plaquettaire',
  'Тромбоциты', 'Тр', 'PLT',
  'Тромбоцити'
]), normalize_biomarker_name(unnest(ARRAY[
  'Platelets', 'PLT', 'Thrombocytes', 'Platelet Count',
  'Plaquettes', 'Thrombocytes', 'Numération plaquettaire',
  'Тромбоциты', 'Тр', 'PLT',
  'Тромбоцити'
]))
FROM biomarker_master WHERE canonical_name = 'platelets'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Neutrophils
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Neutrophils', 'NEUT', 'Neutrophil %', 'Neutro', 'Segmented Neutrophils',
  'Neutrophiles', 'Polynucléaires neutrophiles', 'PNN',
  'Нейтрофилы', 'Нейтр', 'NEUT',
  'Нейтрофіли'
]), normalize_biomarker_name(unnest(ARRAY[
  'Neutrophils', 'NEUT', 'Neutrophil %', 'Neutro', 'Segmented Neutrophils',
  'Neutrophiles', 'Polynucléaires neutrophiles', 'PNN',
  'Нейтрофилы', 'Нейтр', 'NEUT',
  'Нейтрофіли'
]))
FROM biomarker_master WHERE canonical_name = 'neutrophils'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Lymphocytes
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Lymphocytes', 'LYMPH', 'Lymphocyte %', 'Lymphs',
  'Lymphocytes', 'LYM',
  'Лимфоциты', 'Лимф', 'LYMPH',
  'Лімфоцити'
]), normalize_biomarker_name(unnest(ARRAY[
  'Lymphocytes', 'LYMPH', 'Lymphocyte %', 'Lymphs',
  'Lymphocytes', 'LYM',
  'Лимфоциты', 'Лимф', 'LYMPH',
  'Лімфоцити'
]))
FROM biomarker_master WHERE canonical_name = 'lymphocytes'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Monocytes
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Monocytes', 'MONO', 'Monocyte %', 'Monos',
  'Monocytes', 'MON',
  'Моноциты', 'Моно', 'MONO',
  'Моноцити'
]), normalize_biomarker_name(unnest(ARRAY[
  'Monocytes', 'MONO', 'Monocyte %', 'Monos',
  'Monocytes', 'MON',
  'Моноциты', 'Моно', 'MONO',
  'Моноцити'
]))
FROM biomarker_master WHERE canonical_name = 'monocytes'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Eosinophils
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Eosinophils', 'EOS', 'Eosinophil %', 'Eosino',
  'Éosinophiles', 'EO',
  'Эозинофилы', 'Эоз', 'EOS',
  'Еозинофіли'
]), normalize_biomarker_name(unnest(ARRAY[
  'Eosinophils', 'EOS', 'Eosinophil %', 'Eosino',
  'Éosinophiles', 'EO',
  'Эозинофилы', 'Эоз', 'EOS',
  'Еозинофіли'
]))
FROM biomarker_master WHERE canonical_name = 'eosinophils'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Basophils
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Basophils', 'BASO', 'Basophil %', 'Basos',
  'Basophiles', 'BA',
  'Базофилы', 'Баз', 'BASO',
  'Базофіли'
]), normalize_biomarker_name(unnest(ARRAY[
  'Basophils', 'BASO', 'Basophil %', 'Basos',
  'Basophiles', 'BA',
  'Базофилы', 'Баз', 'BASO',
  'Базофіли'
]))
FROM biomarker_master WHERE canonical_name = 'basophils'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Bilirubin Total
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Total Bilirubin', 'Bilirubin Total', 'TBIL', 'Total Bili', 'Bilirubin T',
  'Bilirubine totale', 'Bilirubine T',
  'Билирубин общий', 'Билирубин', 'Общ билирубин',
  'Білірубін загальний'
]), normalize_biomarker_name(unnest(ARRAY[
  'Total Bilirubin', 'Bilirubin Total', 'TBIL', 'Total Bili', 'Bilirubin T',
  'Bilirubine totale', 'Bilirubine T',
  'Билирубин общий', 'Билирубин', 'Общ билирубин',
  'Білірубін загальний'
]))
FROM biomarker_master WHERE canonical_name = 'bilirubin_total'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Bilirubin Direct
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Direct Bilirubin', 'Bilirubin Direct', 'DBIL', 'Conjugated Bilirubin', 'Bilirubin D',
  'Bilirubine directe', 'Bilirubine conjuguée',
  'Билирубин прямой', 'Прям билирубин', 'Билирубин конъюгированный',
  'Білірубін прямий'
]), normalize_biomarker_name(unnest(ARRAY[
  'Direct Bilirubin', 'Bilirubin Direct', 'DBIL', 'Conjugated Bilirubin', 'Bilirubin D',
  'Bilirubine directe', 'Bilirubine conjuguée',
  'Билирубин прямой', 'Прям билирубин', 'Билирубин конъюгированный',
  'Білірубін прямий'
]))
FROM biomarker_master WHERE canonical_name = 'bilirubin_direct'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- LDH
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'LDH', 'Lactate Dehydrogenase', 'LD', 'Lactic Dehydrogenase',
  'LDH', 'Lactate déshydrogénase',
  'ЛДГ', 'Лактатдегидрогеназа', 'LDH',
  'ЛДГ', 'Лактатдегідрогеназа'
]), normalize_biomarker_name(unnest(ARRAY[
  'LDH', 'Lactate Dehydrogenase', 'LD', 'Lactic Dehydrogenase',
  'LDH', 'Lactate déshydrogénase',
  'ЛДГ', 'Лактатдегидрогеназа', 'LDH',
  'ЛДГ', 'Лактатдегідрогеназа'
]))
FROM biomarker_master WHERE canonical_name = 'ldh'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Total Protein
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Total Protein', 'TP', 'Serum Protein', 'Total Serum Protein',
  'Protéines totales', 'Protides totaux',
  'Общий белок', 'Белок общий', 'TP',
  'Загальний білок'
]), normalize_biomarker_name(unnest(ARRAY[
  'Total Protein', 'TP', 'Serum Protein', 'Total Serum Protein',
  'Protéines totales', 'Protides totaux',
  'Общий белок', 'Белок общий', 'TP',
  'Загальний білок'
]))
FROM biomarker_master WHERE canonical_name = 'total_protein'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Albumin
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Albumin', 'ALB', 'Serum Albumin', 'Blood Albumin',
  'Albumine', 'Albumine sérique',
  'Альбумин', 'Алб', 'ALB',
  'Альбумін'
]), normalize_biomarker_name(unnest(ARRAY[
  'Albumin', 'ALB', 'Serum Albumin', 'Blood Albumin',
  'Albumine', 'Albumine sérique',
  'Альбумин', 'Алб', 'ALB',
  'Альбумін'
]))
FROM biomarker_master WHERE canonical_name = 'albumin'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Globulin
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Globulin', 'GLOB', 'Globulins', 'Serum Globulin',
  'Globulines', 'Globuline sérique',
  'Глобулины', 'Глоб', 'GLOB',
  'Глобуліни'
]), normalize_biomarker_name(unnest(ARRAY[
  'Globulin', 'GLOB', 'Globulins', 'Serum Globulin',
  'Globulines', 'Globuline sérique',
  'Глобулины', 'Глоб', 'GLOB',
  'Глобуліни'
]))
FROM biomarker_master WHERE canonical_name = 'globulin'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Fasting Insulin
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Fasting Insulin', 'Insulin Fasting', 'Insulin', 'Serum Insulin', 'Basal Insulin',
  'Insuline à jeun', 'Insuline',
  'Инсулин натощак', 'Инсулин', 'Базальный инсулин',
  'Інсулін натщесерце'
]), normalize_biomarker_name(unnest(ARRAY[
  'Fasting Insulin', 'Insulin Fasting', 'Insulin', 'Serum Insulin', 'Basal Insulin',
  'Insuline à jeun', 'Insuline',
  'Инсулин натощак', 'Инсулин', 'Базальный инсулин',
  'Інсулін натщесерце'
]))
FROM biomarker_master WHERE canonical_name = 'insulin_fasting'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Homocysteine
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Homocysteine', 'Homocystine', 'HCY', 'Hcy', 'Total Homocysteine',
  'Homocystéine', 'Homocystine',
  'Гомоцистеин', 'ГЦ', 'HCY',
  'Гомоцистеїн'
]), normalize_biomarker_name(unnest(ARRAY[
  'Homocysteine', 'Homocystine', 'HCY', 'Hcy', 'Total Homocysteine',
  'Homocystéine', 'Homocystine',
  'Гомоцистеин', 'ГЦ', 'HCY',
  'Гомоцистеїн'
]))
FROM biomarker_master WHERE canonical_name = 'homocysteine'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Sodium
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Sodium', 'Na', 'Na+', 'Serum Sodium', 'Blood Sodium',
  'Sodium', 'Natrium', 'Na',
  'Натрий', 'Na', 'Натр',
  'Натрій'
]), normalize_biomarker_name(unnest(ARRAY[
  'Sodium', 'Na', 'Na+', 'Serum Sodium', 'Blood Sodium',
  'Sodium', 'Natrium', 'Na',
  'Натрий', 'Na', 'Натр',
  'Натрій'
]))
FROM biomarker_master WHERE canonical_name = 'sodium'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Potassium
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Potassium', 'K', 'K+', 'Serum Potassium', 'Blood Potassium',
  'Potassium', 'Kalium', 'K',
  'Калий', 'K', 'Кал',
  'Калій'
]), normalize_biomarker_name(unnest(ARRAY[
  'Potassium', 'K', 'K+', 'Serum Potassium', 'Blood Potassium',
  'Potassium', 'Kalium', 'K',
  'Калий', 'K', 'Кал',
  'Калій'
]))
FROM biomarker_master WHERE canonical_name = 'potassium'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Chloride
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Chloride', 'Cl', 'Cl-', 'Serum Chloride', 'Blood Chloride',
  'Chlorure', 'Chlore', 'Cl',
  'Хлор', 'Хлориды', 'Cl',
  'Хлор'
]), normalize_biomarker_name(unnest(ARRAY[
  'Chloride', 'Cl', 'Cl-', 'Serum Chloride', 'Blood Chloride',
  'Chlorure', 'Chlore', 'Cl',
  'Хлор', 'Хлориды', 'Cl',
  'Хлор'
]))
FROM biomarker_master WHERE canonical_name = 'chloride'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Free T4
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Free T4', 'FT4', 'Free Thyroxine', 'T4 Free', 'Thyroxine Free',
  'T4 libre', 'FT4', 'Thyroxine libre',
  'Свободный Т4', 'СТ4', 'FT4', 'Тироксин свободный',
  'Вільний Т4'
]), normalize_biomarker_name(unnest(ARRAY[
  'Free T4', 'FT4', 'Free Thyroxine', 'T4 Free', 'Thyroxine Free',
  'T4 libre', 'FT4', 'Thyroxine libre',
  'Свободный Т4', 'СТ4', 'FT4', 'Тироксин свободный',
  'Вільний Т4'
]))
FROM biomarker_master WHERE canonical_name = 'free_t4'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Free T3
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Free T3', 'FT3', 'Free Triiodothyronine', 'T3 Free', 'Triiodothyronine Free',
  'T3 libre', 'FT3', 'Triiodothyronine libre',
  'Свободный Т3', 'СТ3', 'FT3', 'Трийодтиронин свободный',
  'Вільний Т3'
]), normalize_biomarker_name(unnest(ARRAY[
  'Free T3', 'FT3', 'Free Triiodothyronine', 'T3 Free', 'Triiodothyronine Free',
  'T3 libre', 'FT3', 'Triiodothyronine libre',
  'Свободный Т3', 'СТ3', 'FT3', 'Трийодтиронин свободный',
  'Вільний Т3'
]))
FROM biomarker_master WHERE canonical_name = 'free_t3'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Urea
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Urea', 'Blood Urea', 'BUN', 'Urea Nitrogen', 'Serum Urea',
  'Urée', 'Azote uréique',
  'Мочевина', 'Мочевина крови', 'BUN',
  'Сечовина'
]), normalize_biomarker_name(unnest(ARRAY[
  'Urea', 'Blood Urea', 'BUN', 'Urea Nitrogen', 'Serum Urea',
  'Urée', 'Azote uréique',
  'Мочевина', 'Мочевина крови', 'BUN',
  'Сечовина'
]))
FROM biomarker_master WHERE canonical_name = 'urea'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;

-- Uric Acid
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized)
SELECT id, unnest(ARRAY[
  'Uric Acid', 'Urate', 'UA', 'Serum Uric Acid',
  'Acide urique', 'Urate',
  'Мочевая кислота', 'МК', 'UA',
  'Сечова кислота'
]), normalize_biomarker_name(unnest(ARRAY[
  'Uric Acid', 'Urate', 'UA', 'Serum Uric Acid',
  'Acide urique', 'Urate',
  'Мочевая кислота', 'МК', 'UA',
  'Сечова кислота'
]))
FROM biomarker_master WHERE canonical_name = 'uric_acid'
ON CONFLICT (biomarker_id, alias_normalized) DO NOTHING;
