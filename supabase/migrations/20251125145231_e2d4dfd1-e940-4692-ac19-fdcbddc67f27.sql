-- Add urinalysis category biomarkers to biomarker_master
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges) VALUES
('urine_ph', 'pH мочи', 'urinalysis', '-', 'quantitative', '{"adult": {"min": 5.0, "max": 7.0}}'::jsonb),
('urine_specific_gravity', 'Удельный вес', 'urinalysis', '-', 'quantitative', '{"adult": {"min": 1.010, "max": 1.025}}'::jsonb),
('urine_protein', 'Белок в моче', 'urinalysis', 'г/л', 'qualitative', '{}'::jsonb),
('urine_glucose', 'Глюкоза в моче', 'urinalysis', 'ммоль/л', 'qualitative', '{}'::jsonb),
('urine_ketones', 'Кетоновые тела', 'urinalysis', 'ммоль/л', 'qualitative', '{}'::jsonb),
('urine_blood', 'Кровь в моче', 'urinalysis', '-', 'qualitative', '{}'::jsonb),
('urine_leukocytes', 'Лейкоциты мочи', 'urinalysis', 'в п/з', 'quantitative', '{"adult": {"min": 0, "max": 5}}'::jsonb),
('urine_erythrocytes', 'Эритроциты мочи', 'urinalysis', 'в п/з', 'quantitative', '{"adult": {"min": 0, "max": 2}}'::jsonb),
('urine_nitrites', 'Нитриты', 'urinalysis', '-', 'qualitative', '{}'::jsonb),
('urine_urobilinogen', 'Уробилиноген', 'urinalysis', 'мкмоль/л', 'qualitative', '{}'::jsonb),
('urine_bilirubin', 'Билирубин мочи', 'urinalysis', '-', 'qualitative', '{}'::jsonb),
('urine_color', 'Цвет мочи', 'urinalysis', '-', 'qualitative', '{}'::jsonb),
('urine_clarity', 'Прозрачность', 'urinalysis', '-', 'qualitative', '{}'::jsonb),
('urine_epithelial_cells', 'Эпителиальные клетки', 'urinalysis', 'в п/з', 'quantitative', '{"adult": {"min": 0, "max": 5}}'::jsonb),
('urine_bacteria', 'Бактерии', 'urinalysis', '-', 'qualitative', '{}'::jsonb),
('urine_casts', 'Цилиндры', 'urinalysis', 'в п/з', 'quantitative', '{"adult": {"min": 0, "max": 0}}'::jsonb),
('urine_crystals', 'Кристаллы', 'urinalysis', '-', 'qualitative', '{}'::jsonb)
ON CONFLICT (canonical_name) DO NOTHING;

-- Add comprehensive aliases for urine biomarkers using helper function
SELECT insert_biomarker_aliases('urine_ph', ARRAY['pH', 'pH мочи', 'Кислотность', 'Acidité urinaire', 'pH urine', 'Urine pH', 'Реакция мочи', 'Reaction']);
SELECT insert_biomarker_aliases('urine_specific_gravity', ARRAY['Удельный вес', 'Плотность', 'Specific gravity', 'SG', 'Densité', 'Relative density', 'Относительная плотность']);
SELECT insert_biomarker_aliases('urine_protein', ARRAY['Белок', 'Протеин', 'Protein', 'PRO', 'Protéines', 'Белок в моче', 'Protein urine', 'Протеинурия', 'Proteinuria']);
SELECT insert_biomarker_aliases('urine_glucose', ARRAY['Глюкоза', 'GLU', 'Glucose', 'Sugar', 'Глюкоза в моче', 'Glucose urine', 'Глюкозурия', 'Glucosuria']);
SELECT insert_biomarker_aliases('urine_ketones', ARRAY['Кетоны', 'Кетоновые тела', 'KET', 'Ketones', 'Ацетон', 'Acetone', 'Ketone bodies']);
SELECT insert_biomarker_aliases('urine_blood', ARRAY['Кровь', 'BLD', 'Blood', 'Кровь в моче', 'Скрытая кровь', 'Occult blood', 'Гематурия', 'Hematuria']);
SELECT insert_biomarker_aliases('urine_leukocytes', ARRAY['Лейкоциты', 'LEU', 'WBC', 'Leukocytes', 'White blood cells', 'Лейкоциты в моче', 'Лейкоцитурия']);
SELECT insert_biomarker_aliases('urine_erythrocytes', ARRAY['Эритроциты', 'RBC', 'Erythrocytes', 'Red blood cells', 'Эритроциты в моче', 'Эритроцитурия']);
SELECT insert_biomarker_aliases('urine_nitrites', ARRAY['Нитриты', 'NIT', 'Nitrites', 'Nitrite']);
SELECT insert_biomarker_aliases('urine_urobilinogen', ARRAY['Уробилиноген', 'URO', 'Urobilinogen', 'UBG']);
SELECT insert_biomarker_aliases('urine_bilirubin', ARRAY['Билирубин', 'BIL', 'Bilirubin', 'Билирубин мочи', 'Bilirubin urine']);
SELECT insert_biomarker_aliases('urine_color', ARRAY['Цвет', 'Color', 'Colour', 'Цвет мочи', 'Urine color', 'Окраска']);
SELECT insert_biomarker_aliases('urine_clarity', ARRAY['Прозрачность', 'Clarity', 'Appearance', 'Мутность', 'Turbidity']);
SELECT insert_biomarker_aliases('urine_epithelial_cells', ARRAY['Эпителий', 'Эпителиальные клетки', 'Epithelial cells', 'EPI', 'Epithelium']);
SELECT insert_biomarker_aliases('urine_bacteria', ARRAY['Бактерии', 'Bacteria', 'Microbes', 'Бактериурия', 'Bacteriuria']);
SELECT insert_biomarker_aliases('urine_casts', ARRAY['Цилиндры', 'Casts', 'Hyaline casts', 'Гиалиновые цилиндры']);
SELECT insert_biomarker_aliases('urine_crystals', ARRAY['Кристаллы', 'Crystals', 'Соли', 'Salts', 'Crystalluria']);