-- Add more supplements to biomarker_correlations
-- Get biomarker IDs first, then insert correlations

-- Berberine correlations
INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'berberine', id, 'decreases', -15, 'high', 'Berberine significantly reduces fasting glucose through AMPK activation', 8
FROM public.biomarker_master WHERE canonical_name = 'glucose' OR display_name ILIKE '%glucose%' LIMIT 1;

INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'berberine', id, 'decreases', -10, 'high', 'Berberine reduces HbA1c through improved glycemic control', 12
FROM public.biomarker_master WHERE canonical_name = 'hba1c' OR display_name ILIKE '%hba1c%' OR display_name ILIKE '%hemoglobin a1c%' LIMIT 1;

INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'berberine', id, 'decreases', -20, 'high', 'Berberine lowers LDL cholesterol comparable to statins', 8
FROM public.biomarker_master WHERE canonical_name ILIKE '%ldl%' OR display_name ILIKE '%ldl%' LIMIT 1;

INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'berberine', id, 'decreases', -25, 'moderate', 'Berberine reduces triglycerides through lipid metabolism improvement', 8
FROM public.biomarker_master WHERE canonical_name ILIKE '%triglyceride%' OR display_name ILIKE '%triglyceride%' LIMIT 1;

-- NAD+ / NMN correlations
INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'nmn_nad_precursor', id, 'increases', 40, 'moderate', 'NMN supplementation increases cellular NAD+ levels', 4
FROM public.biomarker_master WHERE canonical_name ILIKE '%nad%' OR display_name ILIKE '%nad%' LIMIT 1;

-- Melatonin correlations
INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'melatonin', id, 'decreases', -15, 'moderate', 'Melatonin helps regulate evening cortisol for better sleep', 4
FROM public.biomarker_master WHERE canonical_name ILIKE '%cortisol%' OR display_name ILIKE '%cortisol%' LIMIT 1;

-- Ashwagandha correlations
INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'ashwagandha', id, 'decreases', -27, 'high', 'KSM-66 Ashwagandha reduces cortisol by 27% in clinical trials', 8
FROM public.biomarker_master WHERE canonical_name ILIKE '%cortisol%' OR display_name ILIKE '%cortisol%' LIMIT 1;

INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'ashwagandha', id, 'increases', 15, 'moderate', 'Ashwagandha may support healthy testosterone levels', 12
FROM public.biomarker_master WHERE canonical_name ILIKE '%testosterone%' OR display_name ILIKE '%testosterone%' LIMIT 1;

-- Vitamin K2 correlations
INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'vitamin_k2_mk7', id, 'increases', 10, 'moderate', 'Vitamin K2 improves calcium utilization and bone formation', 12
FROM public.biomarker_master WHERE canonical_name ILIKE '%calcium%' OR display_name ILIKE '%calcium%' LIMIT 1;

-- Curcumin correlations
INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'curcumin', id, 'decreases', -30, 'high', 'Curcumin significantly reduces C-reactive protein (inflammation)', 8
FROM public.biomarker_master WHERE canonical_name ILIKE '%crp%' OR display_name ILIKE '%c-reactive%' OR display_name ILIKE '%crp%' LIMIT 1;

-- Alpha Lipoic Acid correlations
INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'alpha_lipoic_acid', id, 'decreases', -10, 'moderate', 'Alpha lipoic acid improves insulin sensitivity and glucose uptake', 8
FROM public.biomarker_master WHERE canonical_name = 'glucose' OR display_name ILIKE '%glucose%' LIMIT 1;

-- Selenium correlations  
INSERT INTO public.biomarker_correlations (supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary, timeframe_weeks)
SELECT 'selenium', id, 'increases', 20, 'high', 'Selenium is essential for T3/T4 conversion in thyroid', 8
FROM public.biomarker_master WHERE canonical_name ILIKE '%t3%' OR display_name ILIKE '%t3%' OR display_name ILIKE '%triiodothyronine%' LIMIT 1;

-- Add synonyms for new supplements
INSERT INTO public.supplement_synonyms (synonym, canonical_name, language, confidence) VALUES
('Берберин', 'berberine', 'ru', 0.95),
('Berberine HCL', 'berberine', 'en', 0.95),
('НМН', 'nmn_nad_precursor', 'ru', 0.90),
('NMN', 'nmn_nad_precursor', 'en', 0.95),
('NAD+', 'nmn_nad_precursor', 'en', 0.85),
('Nicotinamide Mononucleotide', 'nmn_nad_precursor', 'en', 0.95),
('Мелатонин', 'melatonin', 'ru', 0.95),
('Melatonin', 'melatonin', 'en', 0.95),
('Ашваганда', 'ashwagandha', 'ru', 0.95),
('Ашвагандха', 'ashwagandha', 'ru', 0.95),
('KSM-66', 'ashwagandha', 'en', 0.90),
('Withania somnifera', 'ashwagandha', 'en', 0.95),
('Витамин К2', 'vitamin_k2_mk7', 'ru', 0.95),
('Vitamin K2 MK-7', 'vitamin_k2_mk7', 'en', 0.95),
('MK-7', 'vitamin_k2_mk7', 'en', 0.85),
('Куркумин', 'curcumin', 'ru', 0.95),
('Curcumin', 'curcumin', 'en', 0.95),
('Turmeric Extract', 'curcumin', 'en', 0.80),
('Альфа-липоевая кислота', 'alpha_lipoic_acid', 'ru', 0.95),
('Alpha Lipoic Acid', 'alpha_lipoic_acid', 'en', 0.95),
('ALA', 'alpha_lipoic_acid', 'en', 0.80),
('Селен', 'selenium', 'ru', 0.95),
('Selenium', 'selenium', 'en', 0.95),
('Selenomethionine', 'selenium', 'en', 0.90)
ON CONFLICT DO NOTHING;