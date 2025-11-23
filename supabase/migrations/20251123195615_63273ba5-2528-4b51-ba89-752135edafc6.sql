-- Add normalized alias column for fast matching
ALTER TABLE biomarker_aliases ADD COLUMN alias_normalized TEXT;

-- Create normalization function
CREATE OR REPLACE FUNCTION normalize_biomarker_name(name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(REGEXP_REPLACE(TRIM(name), '[^a-z0-9]', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate normalized aliases
UPDATE biomarker_aliases SET alias_normalized = normalize_biomarker_name(alias);

-- Create index for fast lookups
CREATE INDEX idx_biomarker_aliases_normalized ON biomarker_aliases(alias_normalized);

-- Insert comprehensive aliases for top blood test biomarkers
-- White Blood Cells
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['WBC', 'White Blood Cells', 'Leucocytes', 'Leukocytes', 'Лейкоцити', 'Лейкоциты', 'Leucocytes totaux', 'GB']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'en', 'ua', 'ru', 'fr', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['WBC', 'White Blood Cells', 'Leucocytes', 'Leukocytes', 'Лейкоцити', 'Лейкоциты', 'Leucocytes totaux', 'GB']))
FROM biomarker_master WHERE canonical_name = 'wbc'
ON CONFLICT DO NOTHING;

-- Red Blood Cells
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['RBC', 'Red Blood Cells', 'Erythrocytes', 'Еритроцити', 'Эритроциты', 'Hématies', 'GR']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ua', 'ru', 'fr', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['RBC', 'Red Blood Cells', 'Erythrocytes', 'Еритроцити', 'Эритроциты', 'Hématies', 'GR']))
FROM biomarker_master WHERE canonical_name = 'rbc'
ON CONFLICT DO NOTHING;

-- Hemoglobin
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['HGB', 'Hemoglobin', 'Haemoglobin', 'Hb', 'Гемоглобін', 'Гемоглобин', 'Hémoglobine']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'en', 'ua', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['HGB', 'Hemoglobin', 'Haemoglobin', 'Hb', 'Гемоглобін', 'Гемоглобин', 'Hémoglobine']))
FROM biomarker_master WHERE canonical_name = 'hemoglobin'
ON CONFLICT DO NOTHING;

-- Hematocrit
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['HCT', 'Hematocrit', 'Haematocrit', 'Гематокрит', 'Hématocrite']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['HCT', 'Hematocrit', 'Haematocrit', 'Гематокрит', 'Hématocrite']))
FROM biomarker_master WHERE canonical_name = 'hematocrit'
ON CONFLICT DO NOTHING;

-- Platelets
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['PLT', 'Platelets', 'Thrombocytes', 'Тромбоцити', 'Тромбоциты', 'Plaquettes']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ua', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['PLT', 'Platelets', 'Thrombocytes', 'Тромбоцити', 'Тромбоциты', 'Plaquettes']))
FROM biomarker_master WHERE canonical_name = 'platelets'
ON CONFLICT DO NOTHING;

-- Lymphocytes
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Lymphocytes', 'LYMPH', 'Лімфоцити', 'Лимфоциты', 'Lymphocytes absolus']) as alias,
       unnest(ARRAY['en', 'en', 'ua', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Lymphocytes', 'LYMPH', 'Лімфоцити', 'Лимфоциты', 'Lymphocytes absolus']))
FROM biomarker_master WHERE canonical_name = 'lymphocytes'
ON CONFLICT DO NOTHING;

-- Monocytes
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Monocytes', 'MONO', 'Моноцити', 'Моноциты', 'Monocytes absolus']) as alias,
       unnest(ARRAY['en', 'en', 'ua', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Monocytes', 'MONO', 'Моноцити', 'Моноциты', 'Monocytes absolus']))
FROM biomarker_master WHERE canonical_name = 'monocytes'
ON CONFLICT DO NOTHING;

-- Neutrophils
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Neutrophils', 'NEUT', 'Нейтрофіли', 'Нейтрофилы', 'Neutrophiles', 'Polynucléaires neutrophiles']) as alias,
       unnest(ARRAY['en', 'en', 'ua', 'ru', 'fr', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Neutrophils', 'NEUT', 'Нейтрофіли', 'Нейтрофилы', 'Neutrophiles', 'Polynucléaires neutrophiles']))
FROM biomarker_master WHERE canonical_name = 'neutrophils'
ON CONFLICT DO NOTHING;

-- Total Cholesterol
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Cholesterol', 'Total Cholesterol', 'Cholesterol Total', 'CHOL', 'Chol', 'Холестерин', 'Холестерол', 'Cholestérol', 'Cholestérol total']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'en', 'en', 'ru', 'ua', 'fr', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Cholesterol', 'Total Cholesterol', 'Cholesterol Total', 'CHOL', 'Chol', 'Холестерин', 'Холестерол', 'Cholestérol', 'Cholestérol total']))
FROM biomarker_master WHERE canonical_name = 'cholesterol_total'
ON CONFLICT DO NOTHING;

-- HDL Cholesterol
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['HDL', 'HDL-C', 'HDL Cholesterol', 'ЛПВЩ', 'Холестерин ЛПВП', 'HDL-Cholestérol', 'Cholestérol HDL']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ua', 'ru', 'fr', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['HDL', 'HDL-C', 'HDL Cholesterol', 'ЛПВЩ', 'Холестерин ЛПВП', 'HDL-Cholestérol', 'Cholestérol HDL']))
FROM biomarker_master WHERE canonical_name = 'cholesterol_hdl'
ON CONFLICT DO NOTHING;

-- LDL Cholesterol
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['LDL', 'LDL-C', 'LDL Cholesterol', 'ЛПНЩ', 'Холестерин ЛПНП', 'LDL-Cholestérol', 'Cholestérol LDL']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ua', 'ru', 'fr', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['LDL', 'LDL-C', 'LDL Cholesterol', 'ЛПНЩ', 'Холестерин ЛПНП', 'LDL-Cholestérol', 'Cholestérol LDL']))
FROM biomarker_master WHERE canonical_name = 'cholesterol_ldl'
ON CONFLICT DO NOTHING;

-- Triglycerides
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Triglycerides', 'TG', 'TRIG', 'Тригліцериди', 'Триглицериды', 'Triglycérides']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ua', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Triglycerides', 'TG', 'TRIG', 'Тригліцериди', 'Триглицериды', 'Triglycérides']))
FROM biomarker_master WHERE canonical_name = 'triglycerides'
ON CONFLICT DO NOTHING;

-- ALT
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['ALT', 'ALAT', 'SGPT', 'ALAT/SGPT', 'Аланинаминотрансфераза', 'АЛТ', 'Transaminase ALAT']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'en', 'ru', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['ALT', 'ALAT', 'SGPT', 'ALAT/SGPT', 'Аланинаминотрансфераза', 'АЛТ', 'Transaminase ALAT']))
FROM biomarker_master WHERE canonical_name = 'alt'
ON CONFLICT DO NOTHING;

-- AST
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['AST', 'ASAT', 'SGOT', 'ASAT/SGOT', 'Аспартатаминотрансфераза', 'АСТ', 'Transaminase ASAT']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'en', 'ru', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['AST', 'ASAT', 'SGOT', 'ASAT/SGOT', 'Аспартатаминотрансфераза', 'АСТ', 'Transaminase ASAT']))
FROM biomarker_master WHERE canonical_name = 'ast'
ON CONFLICT DO NOTHING;

-- GGT
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['GGT', 'Gamma-GT', 'γ-GT', 'Gamma GT', 'ГГТП', 'Гамма-глутамилтрансфераза', 'Gamma-glutamyltransférase']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'en', 'ru', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['GGT', 'Gamma-GT', 'γ-GT', 'Gamma GT', 'ГГТП', 'Гамма-глутамилтрансфераза', 'Gamma-glutamyltransférase']))
FROM biomarker_master WHERE canonical_name = 'ggt'
ON CONFLICT DO NOTHING;

-- Glucose
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Glucose', 'Blood Glucose', 'GLU', 'Глюкоза', 'Glycémie', 'Glucose à jeun']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ru', 'fr', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Glucose', 'Blood Glucose', 'GLU', 'Глюкоза', 'Glycémie', 'Glucose à jeun']))
FROM biomarker_master WHERE canonical_name = 'glucose'
ON CONFLICT DO NOTHING;

-- HbA1c
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['HbA1c', 'Hemoglobin A1c', 'A1C', 'Glycated Hemoglobin', 'Гликированный гемоглобин', 'Hémoglobine glyquée']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'en', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['HbA1c', 'Hemoglobin A1c', 'A1C', 'Glycated Hemoglobin', 'Гликированный гемоглобин', 'Hémoglobine glyquée']))
FROM biomarker_master WHERE canonical_name = 'hba1c'
ON CONFLICT DO NOTHING;

-- Creatinine
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Creatinine', 'CREA', 'Креатинин', 'Créatinine']) as alias,
       unnest(ARRAY['en', 'en', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Creatinine', 'CREA', 'Креатинин', 'Créatinine']))
FROM biomarker_master WHERE canonical_name = 'creatinine'
ON CONFLICT DO NOTHING;

-- TSH
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['TSH', 'Thyroid Stimulating Hormone', 'Thyrotropin', 'ТТГ', 'Тиреотропный гормон', 'Hormone thyréotrope']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ru', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['TSH', 'Thyroid Stimulating Hormone', 'Thyrotropin', 'ТТГ', 'Тиреотропный гормон', 'Hormone thyréotrope']))
FROM biomarker_master WHERE canonical_name = 'tsh'
ON CONFLICT DO NOTHING;

-- Vitamin D
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Vitamin D', '25-OH Vitamin D', '25(OH)D', 'Vit D', 'Витамин D', 'Vitamine D']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'en', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Vitamin D', '25-OH Vitamin D', '25(OH)D', 'Vit D', 'Витамин D', 'Vitamine D']))
FROM biomarker_master WHERE canonical_name = 'vitamin_d'
ON CONFLICT DO NOTHING;

-- Vitamin B12
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Vitamin B12', 'Cobalamin', 'B12', 'Витамин B12', 'Vitamine B12']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Vitamin B12', 'Cobalamin', 'B12', 'Витамин B12', 'Vitamine B12']))
FROM biomarker_master WHERE canonical_name = 'vitamin_b12'
ON CONFLICT DO NOTHING;

-- Ferritin
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Ferritin', 'FER', 'Ферритин', 'Ferritine']) as alias,
       unnest(ARRAY['en', 'en', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Ferritin', 'FER', 'Ферритин', 'Ferritine']))
FROM biomarker_master WHERE canonical_name = 'ferritin'
ON CONFLICT DO NOTHING;

-- Iron
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Iron', 'Serum Iron', 'Fe', 'Залізо', 'Железо', 'Fer sérique']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ua', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Iron', 'Serum Iron', 'Fe', 'Залізо', 'Железо', 'Fer sérique']))
FROM biomarker_master WHERE canonical_name = 'iron'
ON CONFLICT DO NOTHING;

-- Testosterone
INSERT INTO biomarker_aliases (biomarker_id, alias, language, source, alias_normalized)
SELECT id, unnest(ARRAY['Testosterone', 'Total Testosterone', 'TEST', 'Тестостерон', 'Testostérone']) as alias,
       unnest(ARRAY['en', 'en', 'en', 'ru', 'fr']) as language,
       'standard' as source,
       normalize_biomarker_name(unnest(ARRAY['Testosterone', 'Total Testosterone', 'TEST', 'Тестостерон', 'Testostérone']))
FROM biomarker_master WHERE canonical_name = 'testosterone'
ON CONFLICT DO NOTHING;