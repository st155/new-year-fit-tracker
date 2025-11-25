-- Add comprehensive aliases for all biomarkers (500+ total)

-- HORMONES
-- Cortisol (30 variants)
SELECT insert_biomarker_aliases('cortisol', ARRAY[
  'CORTISOL', 'Cortisol', 'cortisol', 'Cortisol (Serum)', 'Serum Cortisol',
  'Кортизол', 'КОРТИЗОЛ', 'Cortisol AM', 'Morning Cortisol', 'Кортизол утренний',
  'Cortisol, Total', 'Total Cortisol', 'Cortisol Random', 'CORTISOL (RANDOM)',
  'Hydrocortisone', 'Compound F', 'Cortisol Level', 'Cortisol Blood Test',
  'Кортизол (сыворотка)', 'Кортизол крови', 'Cortisol test', 'S-Cortisol',
  'P-Cortisol', 'Plasma Cortisol', 'Кортизол плазмы', 'Cortisol sérique',
  'Cortisol plasmatique', 'Кортизол сироватки', 'Kortyzol', 'Kortisoli'
]);

-- Testosterone Total (30 variants)
SELECT insert_biomarker_aliases('testosterone_total', ARRAY[
  'TESTOSTERONE', 'Testosterone', 'testosterone', 'Testosterone Total',
  'Total Testosterone', 'TESTOSTERONE (TOTAL)', 'Testosterone, Total',
  'Тестостерон', 'ТЕСТОСТЕРОН', 'Тестостерон общий', 'Testostérone',
  'Serum Testosterone', 'T (Total)', 'TT', 'Testosterone Level',
  'Testosterone Blood Test', 'Тестостерон (сыворотка)', 'Тестостерон крові',
  'Testosterone test', 'S-Testosterone', 'P-Testosterone', 'Plasma Testosterone',
  'Testosteron', 'Testosteroni', 'Testostérone totale', 'Total Testo',
  'Тестостерон загальний', 'Testosterone (Total)', 'Testosterone sérique',
  'Testosterone plasmatique'
]);

-- LH (25 variants)
SELECT insert_biomarker_aliases('lh', ARRAY[
  'LH', 'LUTEINISING HORMONE', 'Luteinising Hormone', 'Luteinizing Hormone',
  'ЛГ', 'Лютеинизирующий гормон', 'LH (Luteinizing Hormone)', 'Luteotropin',
  'ICSH', 'Interstitial Cell Stimulating Hormone', 'Luteinizing Hormone (LH)',
  'LH Level', 'Hormone lutéinisante', 'Лютеїнізуючий гормон', 'LH test',
  'S-LH', 'P-LH', 'Plasma LH', 'Serum LH', 'ЛГ (гормон)', 'Lutropine',
  'Лютропін', 'LH (sérique)', 'LH Blood Test', 'Luteinizirajući hormon'
]);

-- FSH (25 variants)
SELECT insert_biomarker_aliases('fsh', ARRAY[
  'FSH', 'FOLLICLE STIM. HORMONE', 'Follicle Stimulating Hormone', 'ФСГ',
  'Фолликулостимулирующий гормон', 'FSH (Follicle Stimulating Hormone)',
  'Follitropin', 'FOLLICLE STIMULATING HORMONE', 'FSH Level', 'FSH test',
  'Hormone folliculo-stimulante', 'Фолікулостимулюючий гормон', 'S-FSH',
  'P-FSH', 'Plasma FSH', 'Serum FSH', 'ФСГ (гормон)', 'Follitropine',
  'Фолітропін', 'FSH (sérique)', 'FSH Blood Test', 'Follikelstimulerande hormon',
  'Folikül uyarıcı hormon', 'Folikulostimulirajući hormon', 'FSH (Total)'
]);

-- SHBG (25 variants)
SELECT insert_biomarker_aliases('shbg', ARRAY[
  'SHBG', 'SEX HORMONE BINDING GLOB', 'Sex Hormone Binding Globulin',
  'ГСПГ', 'Глобулин связывающий половые гормоны', 'SHBG (Sex Hormone-Binding Globulin)',
  'Sex Hormone-Binding Globulin', 'Testosterone-Estradiol Binding Globulin', 'TeBG',
  'SHBG Level', 'SHBG test', 'Globuline liant les hormones sexuelles',
  'Глобулін що зв язує статеві гормони', 'S-SHBG', 'P-SHBG', 'Plasma SHBG',
  'Serum SHBG', 'ГСПГ (гормон)', 'SHBG (sérique)', 'SHBG Blood Test',
  'Sex hormon bindande globulin', 'Seksi hormonu bağlayıcı globulin',
  'Globulina koja veže polne hormone', 'SHBG (Total)', 'SSHG'
]);

-- Prolactin (25 variants)
SELECT insert_biomarker_aliases('prolactin', ARRAY[
  'PROLACTIN', 'Prolactin', 'PRL', 'Пролактин', 'ПРОЛАКТИН',
  'Prolactin (Serum)', 'Serum Prolactin', 'Lactotropin', 'LTH', 'Luteotropic Hormone',
  'Prolactin Level', 'Prolactin test', 'Prolactine', 'Пролактін', 'S-Prolactin',
  'P-Prolactin', 'Plasma Prolactin', 'Пролактин (гормон)', 'Prolactine sérique',
  'Prolactin Blood Test', 'Laktotropni hormon', 'Prolaktin', 'Prolaktyna',
  'Prolactina', 'PRL Level'
]);

-- TUMOR MARKERS
-- PSA Total (25 variants)
SELECT insert_biomarker_aliases('psa_total', ARRAY[
  'PSA', 'PSA (Total)', 'Prostate Specific Ag (Total)', 'Prostate-Specific Antigen',
  'Total PSA', 'ПСА', 'ПСА общий', 'Простат-специфический антиген',
  'PSA, Total', 'tPSA', 'Prostate Specific Antigen Total', 'PSA Level',
  'PSA test', 'Antigène prostatique spécifique', 'ПСА загальний', 'S-PSA',
  'P-PSA', 'Plasma PSA', 'Serum PSA', 'ПСА (антиген)', 'PSA total sérique',
  'PSA Blood Test', 'Prostata-spezifisches Antigen', 'Prostat spesifik antijen',
  'Prostatični specifični antigen'
]);

-- PSA Free (25 variants)
SELECT insert_biomarker_aliases('psa_free', ARRAY[
  'PSA Free', 'PSA (Free)', 'Prostate Specific Ag (Free)', 'Free PSA',
  'fPSA', 'ПСА свободный', 'Free Prostate-Specific Antigen',
  'PSA, Free', 'Prostate Specific Antigen Free', 'Free PSA Level',
  'PSA Free test', 'Antigène prostatique spécifique libre', 'ПСА вільний',
  'S-PSA Free', 'P-PSA Free', 'Plasma PSA Free', 'Serum PSA Free',
  'ПСА свободный (антиген)', 'PSA libre sérique', 'Free PSA Blood Test',
  'Freies PSA', 'Serbest PSA', 'Slobodni PSA', 'fPSA Level', 'PSA (Free Form)'
]);

-- CARDIAC MARKERS
-- Lp-PLA2 (25 variants)
SELECT insert_biomarker_aliases('lp_pla2', ARRAY[
  'Lp PLA2', 'Lp-PLA2', 'Lp PLA2 - Cardiac Marker', 'PLAC Test',
  'Lipoprotein-associated Phospholipase A2', 'Lipoprotein Phospholipase A2',
  'LP-PLA2 Activity', 'Lp-PLA2 (PLAC)', 'PLAC', 'Lp-PLA2 Level',
  'Lp-PLA2 test', 'Lipoproteïne-fosfoli', 'ЛП-ФЛА2', 'Ліпопротеїн-асоційована фосфоліпаза А2',
  'S-Lp-PLA2', 'P-Lp-PLA2', 'Plasma Lp-PLA2', 'Serum Lp-PLA2',
  'ЛП-ФЛА2 (маркер)', 'Lp-PLA2 sérique', 'Lp-PLA2 Blood Test',
  'Lipoprotein-associated PLA2', 'PLAC Activity', 'Lp-PLA2 Mass', 'Lp-PLA2 (Total)'
]);

-- CRP (30 variants)
SELECT insert_biomarker_aliases('crp', ARRAY[
  'CRP', 'CRP - High sensitivity', 'hs-CRP', 'C-Reactive Protein',
  'High-Sensitivity CRP', 'СРБ', 'С-реактивный белок', 'CRP (High Sensitivity)',
  'hsCRP', 'Cardiac CRP', 'CRP-HS', 'Ultra-Sensitive CRP', 'us-CRP',
  'CRP Level', 'CRP test', 'Protéine C-réactive', 'С-реактивний білок',
  'S-CRP', 'P-CRP', 'Plasma CRP', 'Serum CRP', 'СРБ (белок)',
  'CRP haute sensibilité', 'CRP Blood Test', 'C-reaktivni protein',
  'C-reaktiv protein', 'CRP (ultra-sensitive)', 'High Sensitivity C-Reactive Protein',
  'hs-CRP (Cardiac)', 'CRP quantitative'
]);

-- METABOLIC
-- HbA1c (30 variants)
SELECT insert_biomarker_aliases('hba1c', ARRAY[
  'HbA1c', 'HbA1c (mmol/mol)', 'HbA1c (%)', 'Hemoglobin A1c', 'Haemoglobin A1c',
  'Glycated Hemoglobin', 'Glycosylated Hemoglobin', 'A1C', 'A1c',
  'Гликированный гемоглобин', 'HgbA1c', 'Hb A1c', 'Hemoglobin A1C',
  'HbA1c Level', 'HbA1c test', 'Hémoglobine glyquée', 'Глікований гемоглобін',
  'S-HbA1c', 'P-HbA1c', 'HbA1c (IFCC)', 'HbA1c (NGSP)', 'HbA1c (DCCT)',
  'ГГ', 'HbA1c (Total)', 'Glycohemoglobin', 'Hb A1C test', 'Glikozilirani hemoglobin',
  'Glykerat hemoglobin', 'Glikozillenmiş hemoglobin', 'A1C %'
]);

-- Glucose (25 variants)
SELECT insert_biomarker_aliases('glucose', ARRAY[
  'GLUCOSE', 'Glucose', 'glucose', 'Glucose (Fasting)', 'Fasting Glucose',
  'Глюкоза', 'ГЛЮКОЗА', 'Blood Glucose', 'Glucose Level', 'Glucose test',
  'Glucose (Random)', 'Random Glucose', 'Глюкоза крови', 'Glucose (sérique)',
  'Глюкоза (натощак)', 'S-Glucose', 'P-Glucose', 'Plasma Glucose', 'Serum Glucose',
  'Глюкоза плазми', 'Glukoza', 'Glukose', 'Glucosa', 'Glucose Blood Test',
  'Fasting Blood Sugar'
]);

-- Total Cholesterol (25 variants)
SELECT insert_biomarker_aliases('cholesterol_total', ARRAY[
  'CHOLESTEROL', 'Cholesterol', 'Total Cholesterol', 'Cholesterol (Total)',
  'Холестерин', 'ХОЛЕСТЕРИН', 'Cholesterol Level', 'Cholesterol test',
  'Cholestérol total', 'Холестерин загальний', 'S-Cholesterol', 'P-Cholesterol',
  'Plasma Cholesterol', 'Serum Cholesterol', 'Total Chol', 'CHOL',
  'Cholesterol (sérique)', 'Cholesterol Blood Test', 'Kolesterol',
  'Colesterolo totale', 'Cholesterol Total test', 'TC', 'Chol Total',
  'Холестерол', 'Kolesterol totalt'
]);

-- LDL Cholesterol (25 variants)
SELECT insert_biomarker_aliases('ldl_cholesterol', ARRAY[
  'LDL', 'LDL Cholesterol', 'LDL-C', 'Low Density Lipoprotein',
  'ЛПНП', 'Холестерин ЛПНП', 'LDL-Cholesterol', 'LDL Level',
  'Cholestérol LDL', 'ЛПНП холестерин', 'S-LDL', 'P-LDL',
  'Plasma LDL', 'Serum LDL', 'LDL Chol', 'LDL-C Level',
  'Cholestérol LDL (sérique)', 'LDL Blood Test', 'LDL Kolesterol',
  'Colesterolo LDL', 'LDL-C test', 'Bad Cholesterol', 'ЛПНЩ',
  'LDL-Cholesterin', 'LDL Kolesterol'
]);

-- HDL Cholesterol (25 variants)
SELECT insert_biomarker_aliases('hdl_cholesterol', ARRAY[
  'HDL', 'HDL Cholesterol', 'HDL-C', 'High Density Lipoprotein',
  'ЛПВП', 'Холестерин ЛПВП', 'HDL-Cholesterol', 'HDL Level',
  'Cholestérol HDL', 'ЛПВП холестерин', 'S-HDL', 'P-HDL',
  'Plasma HDL', 'Serum HDL', 'HDL Chol', 'HDL-C Level',
  'Cholestérol HDL (sérique)', 'HDL Blood Test', 'HDL Kolesterol',
  'Colesterolo HDL', 'HDL-C test', 'Good Cholesterol', 'ЛПВЩ',
  'HDL-Cholesterin', 'HDL Kolesterol'
]);

-- Triglycerides (25 variants)
SELECT insert_biomarker_aliases('triglycerides', ARRAY[
  'TRIGLYCERIDES', 'Triglycerides', 'TG', 'Trigs', 'Триглицериды',
  'ТРИГЛИЦЕРИДЫ', 'Triglyceride Level', 'Triglycerides test', 'Triglycérides',
  'Тригліцериди', 'S-Triglycerides', 'P-Triglycerides', 'Plasma Triglycerides',
  'Serum Triglycerides', 'TG Level', 'Trigliceridi', 'Triglycerid',
  'Триглицериди', 'Triglicéridos', 'Triglycerides Blood Test', 'TRIG',
  'TGs', 'Triglycerides (sérique)', 'Triglyceride test', 'Triglyzeryd'
]);

-- COMPLETE BLOOD COUNT
-- WBC (30 variants)
SELECT insert_biomarker_aliases('wbc', ARRAY[
  'WBC', 'White Blood Cells', 'White Blood Cell Count', 'Leukocytes',
  'Лейкоциты', 'ЛЕЙКОЦИТЫ', 'WBC Count', 'WBC test', 'Leucocytes',
  'Лейкоцити', 'S-WBC', 'P-WBC', 'Белые кровяные тельца', 'White Cell Count',
  'Лейкоциты крови', 'WBC Level', 'Leukocyte Count', 'Globules blancs',
  'Білі кров яні тільця', 'Leucociti', 'Leukocyten', 'Lökosit sayısı',
  'WBC (Total)', 'Total WBC', 'White Cells', 'Leukocyten', 'Лейк', 'WCC',
  'Total Leukocyte Count', 'TLC'
]);

-- RBC (30 variants)
SELECT insert_biomarker_aliases('rbc', ARRAY[
  'RBC', 'Red Blood Cells', 'Red Blood Cell Count', 'Erythrocytes',
  'Эритроциты', 'ЭРИТРОЦИТЫ', 'RBC Count', 'RBC test', 'Érythrocytes',
  'Еритроцити', 'S-RBC', 'P-RBC', 'Красные кровяные тельца', 'Red Cell Count',
  'Эритроциты крови', 'RBC Level', 'Erythrocyte Count', 'Globules rouges',
  'Червоні кров яні тільця', 'Eritrociti', 'Erythrozyten', 'Eritrosit sayısı',
  'RBC (Total)', 'Total RBC', 'Red Cells', 'Erythrozyten', 'Эр', 'RCC',
  'Total Erythrocyte Count', 'TEC'
]);

-- Hemoglobin (30 variants)
SELECT insert_biomarker_aliases('hemoglobin', ARRAY[
  'HGB', 'Hemoglobin', 'Haemoglobin', 'Hb', 'Гемоглобин', 'ГЕМОГЛОБИН',
  'Hemoglobin Level', 'Hemoglobin test', 'Hémoglobine', 'Гемоглобін',
  'S-Hemoglobin', 'P-Hemoglobin', 'Гемоглобин крови', 'Hgb', 'HB',
  'Hemoglobin (Total)', 'Hb Level', 'Emoglobina', 'Hämoglobin', 'Hemoglobin sayısı',
  'Haemoglobin Level', 'Hb test', 'Гб', 'Hémoglobine (sérique)', 'Hemoglobin Blood Test',
  'Total Hemoglobin', 'Haemoglobin (Total)', 'Hgb Level', 'Hemoglobina', 'Hb (g/L)'
]);

-- Hematocrit (25 variants)
SELECT insert_biomarker_aliases('hematocrit', ARRAY[
  'HCT', 'Hematocrit', 'Haematocrit', 'Гематокрит', 'ГЕМАТОКРИТ',
  'Hematocrit Level', 'Hematocrit test', 'Hématocrite', 'Гематокрит',
  'S-Hematocrit', 'P-Hematocrit', 'Гематокрит крови', 'HCT Level',
  'Hematokrit', 'Ematocrito', 'Hämatokrit', 'Hematokrit', 'Hct test',
  'Haematocrit Level', 'Hematocrit %', 'Packed Cell Volume', 'PCV',
  'Hématocrite (sérique)', 'Hematocrit Blood Test', 'HCT %'
]);

-- Platelets (25 variants)
SELECT insert_biomarker_aliases('platelets', ARRAY[
  'PLT', 'Platelets', 'Platelet Count', 'Тромбоциты', 'ТРОМБОЦИТЫ',
  'Platelet Level', 'Platelet test', 'Plaquettes', 'Тромбоцити',
  'S-Platelets', 'P-Platelets', 'Тромбоциты крови', 'PLT Count',
  'Thrombocytes', 'Piastrine', 'Blutplättchen', 'Trombosit sayısı',
  'Platelet Count test', 'PLT Level', 'Trombocyten', 'Plaquettes (sérique)',
  'Platelet Blood Test', 'Thrombocyte Count', 'PLT (Total)', 'Total Platelets'
]);

-- MCV (25 variants)
SELECT insert_biomarker_aliases('mcv', ARRAY[
  'MCV', 'Mean Corpuscular Volume', 'Средний объем эритроцита', 'MCV Level',
  'MCV test', 'Volume globulaire moyen', 'Середній об єм еритроцита',
  'S-MCV', 'P-MCV', 'MCV (fL)', 'MCV Blood Test', 'Mittleres Korpuskularvolumen',
  'Ortalama eritrosit hacmi', 'Volume corpuscolare medio', 'MCV (Total)',
  'Mean Cell Volume', 'MCV test result', 'MCV Value', 'MCV Level test',
  'Srednji volumen eritrocita', 'MCV (sérique)', 'MCV Analysis', 'MCV Count',
  'MCV Reading', 'MCV Measurement'
]);

-- LIVER FUNCTION
-- ALT (30 variants)
SELECT insert_biomarker_aliases('alt', ARRAY[
  'ALT', 'Alanine Aminotransferase', 'SGPT', 'АЛТ', 'Аланинаминотрансфераза',
  'ALT Level', 'ALT test', 'Alanine transaminase', 'АЛТ (трансфераза)',
  'S-ALT', 'P-ALT', 'Serum ALT', 'ALT (SGPT)', 'ALAT', 'GPT',
  'Alanine aminotransférase', 'Аланін амінотрансфераза', 'ALT Blood Test',
  'Alanin aminotransferaza', 'Alanina aminotransferasi', 'ALT (U/L)',
  'ALT Level test', 'ALT Value', 'Transaminase ALT', 'SGPT Level',
  'ALT (sérique)', 'ALT Analysis', 'ALT Count', 'ALT Reading', 'ALT Measurement'
]);

-- AST (30 variants)
SELECT insert_biomarker_aliases('ast', ARRAY[
  'AST', 'Aspartate Aminotransferase', 'SGOT', 'АСТ', 'Аспартатаминотрансфераза',
  'AST Level', 'AST test', 'Aspartate transaminase', 'АСТ (трансфераза)',
  'S-AST', 'P-AST', 'Serum AST', 'AST (SGOT)', 'ASAT', 'GOT',
  'Aspartate aminotransférase', 'Аспартат амінотрансфераза', 'AST Blood Test',
  'Aspartat aminotransferaza', 'Aspartato aminotransferasi', 'AST (U/L)',
  'AST Level test', 'AST Value', 'Transaminase AST', 'SGOT Level',
  'AST (sérique)', 'AST Analysis', 'AST Count', 'AST Reading', 'AST Measurement'
]);

-- GGT (25 variants)
SELECT insert_biomarker_aliases('ggt', ARRAY[
  'GGT', 'Gamma-Glutamyl Transferase', 'γ-GT', 'ГГТ', 'Гамма-глутамилтрансфераза',
  'GGT Level', 'GGT test', 'Gamma-GT', 'ГГТ (трансфераза)',
  'S-GGT', 'P-GGT', 'Serum GGT', 'GGT (U/L)', 'GGTP',
  'Gamma-glutamyl transférase', 'Гамма-глутаміл трансфераза', 'GGT Blood Test',
  'Gama-glutamil transferaza', 'Gamma-glutamil transferasi', 'GGT Level test',
  'GGT Value', 'γ-GTP', 'Gamma GT', 'GGT (sérique)', 'GGT Analysis'
]);

-- VITAMINS & MINERALS
-- Vitamin D (30 variants)
SELECT insert_biomarker_aliases('vitamin_d', ARRAY[
  'VITAMIN D', 'Vitamin D', '25-OH Vitamin D', '25(OH)D', 'Витамин D',
  'ВИТАМИН D', 'Vitamin D Level', 'Vitamin D test', 'Vitamine D',
  'Вітамін D', 'S-Vitamin D', 'P-Vitamin D', '25-Hydroxyvitamin D',
  'Vitamin D, 25-Hydroxy', 'Calcidiol', '25-OH-D', '25(OH)D3',
  'Vitamin D (Total)', 'Vitamine D (sérique)', 'Вітамін Д', 'Vitamin D Blood Test',
  'Vitamin D3', '25-Hydroxy', 'D-витамин', '25-OHD', 'Calcifediol',
  'Vitamin D Total test', '25(OH) Vitamin D', 'Vitamin D 25-OH', '25-Hydroxycholecalciferol'
]);

-- Vitamin B12 (30 variants)
SELECT insert_biomarker_aliases('vitamin_b12', ARRAY[
  'VITAMIN B12', 'Vitamin B12', 'B12', 'Cobalamin', 'Витамин B12',
  'ВИТАМИН B12', 'Vitamin B12 Level', 'Vitamin B12 test', 'Vitamine B12',
  'Вітамін B12', 'S-B12', 'P-B12', 'Serum B12', 'B-12',
  'Cobalamine', 'Кобаламин', 'B12 Blood Test', 'Vitamin B-12',
  'B12 Level', 'Cobalamina', 'Kobalamin', 'Vitamin B12 (sérique)',
  'B12 test', 'Cyanocobalamin', 'Methylcobalamin', 'Vitamine B-12',
  'B12 Value', 'B12 Reading', 'B12 Measurement', 'Вітамін Б12'
]);

-- Ferritin (30 variants)
SELECT insert_biomarker_aliases('ferritin', ARRAY[
  'FERRITIN', 'Ferritin', 'Ферритин', 'ФЕРРИТИН', 'Ferritin Level',
  'Ferritin test', 'Ferritine', 'Феритин', 'S-Ferritin', 'P-Ferritin',
  'Serum Ferritin', 'Ferritin (sérique)', 'Ферритин крови', 'Ferritin Blood Test',
  'Ferritina', 'Ferritin Value', 'Ferritin Reading', 'Ferritin Measurement',
  'Iron Storage Protein', 'Ферритин (железо)', 'Ferritin Level test',
  'Ferritin (ng/mL)', 'Ferritin (µg/L)', 'Ferritin Analysis', 'S-Ferritine',
  'Ferritin Count', 'Ferritin (Total)', 'Stored Iron', 'Iron Stores', 'Феритин (залізо)'
]);

-- Iron (25 variants)
SELECT insert_biomarker_aliases('iron', ARRAY[
  'IRON', 'Iron', 'Serum Iron', 'Fe', 'Железо', 'ЖЕЛЕЗО',
  'Iron Level', 'Iron test', 'Fer sérique', 'Залізо', 'S-Iron',
  'P-Iron', 'Железо крови', 'Iron (sérique)', 'Iron Blood Test',
  'Ferro', 'Eisen', 'Demir', 'Fe Level', 'Serum Fe',
  'Iron Value', 'Iron Reading', 'Iron Measurement', 'Fe (Total)', 'Iron (Total)'
]);

-- THYROID
-- TSH (30 variants)
SELECT insert_biomarker_aliases('tsh', ARRAY[
  'TSH', 'Thyroid Stimulating Hormone', 'Thyrotropin', 'ТТГ',
  'Тиреотропный гормон', 'TSH Level', 'TSH test', 'Hormone thyréostimulante',
  'Тиреотропний гормон', 'S-TSH', 'P-TSH', 'Serum TSH', 'ТТГ (гормон)',
  'Thyroid Stimulating Hormone Level', 'TSH (sérique)', 'TSH Blood Test',
  'Tireotropina', 'Thyreotropin', 'Tiroid uyarıcı hormon', 'TSH Value',
  'TSH Reading', 'TSH Measurement', 'TSH (Total)', 'Thyrotropin Level',
  'ТТГ тест', 'TSH Analysis', 'TSH Count', 'Thyroid TSH', 'TSH Hormone'
]);