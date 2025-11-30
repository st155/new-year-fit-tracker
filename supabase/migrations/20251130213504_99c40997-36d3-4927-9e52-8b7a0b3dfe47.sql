-- Phase 6: Biomarker Matching Expansion
-- Add critical aliases for existing biomarkers + create 8 new biomarkers

-- Step 1: Add critical aliases for existing biomarkers
DO $$
DECLARE
  v_copper_id uuid;
  v_vitamin_d_id uuid;
  v_uibc_id uuid;
  v_hematocrit_id uuid;
  v_hemoglobin_id uuid;
  v_platelets_id uuid;
  v_lymphocytes_id uuid;
  v_monocytes_id uuid;
  v_neutrophils_id uuid;
  v_eosinophils_id uuid;
  v_basophils_id uuid;
  v_psa_free_id uuid;
BEGIN
  -- Get biomarker IDs
  SELECT id INTO v_copper_id FROM biomarker_master WHERE canonical_name = 'copper';
  SELECT id INTO v_vitamin_d_id FROM biomarker_master WHERE canonical_name = 'vitamin_d';
  SELECT id INTO v_uibc_id FROM biomarker_master WHERE canonical_name = 'uibc';
  SELECT id INTO v_hematocrit_id FROM biomarker_master WHERE canonical_name = 'hematocrit';
  SELECT id INTO v_hemoglobin_id FROM biomarker_master WHERE canonical_name = 'hemoglobin';
  SELECT id INTO v_platelets_id FROM biomarker_master WHERE canonical_name = 'platelets';
  SELECT id INTO v_lymphocytes_id FROM biomarker_master WHERE canonical_name = 'lymphocytes';
  SELECT id INTO v_monocytes_id FROM biomarker_master WHERE canonical_name = 'monocytes';
  SELECT id INTO v_neutrophils_id FROM biomarker_master WHERE canonical_name = 'neutrophils';
  SELECT id INTO v_eosinophils_id FROM biomarker_master WHERE canonical_name = 'eosinophils';
  SELECT id INTO v_basophils_id FROM biomarker_master WHERE canonical_name = 'basophils';
  SELECT id INTO v_psa_free_id FROM biomarker_master WHERE canonical_name = 'psa_free';

  -- Copper aliases
  IF v_copper_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_copper_id, 'Copper - Cu', 'coppercu', 'en', 'lab_common'),
    (v_copper_id, 'coppercu', 'coppercu', 'en', 'lab_common'),
    (v_copper_id, 'Cu', 'cu', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Vitamin D aliases
  IF v_vitamin_d_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_vitamin_d_id, '25-OH Vitamin D3', '25ohvitamind3', 'en', 'lab_common'),
    (v_vitamin_d_id, '25ohvitamind3', '25ohvitamind3', 'en', 'lab_common'),
    (v_vitamin_d_id, '25(OH)D3', '25ohd3', 'en', 'lab_common'),
    (v_vitamin_d_id, 'Vitamin D3 25-OH', 'vitamind325oh', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  -- UIBC aliases
  IF v_uibc_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_uibc_id, 'Iron-binding Capacity UIBC', 'ironbindingcapacityuibc', 'en', 'lab_common'),
    (v_uibc_id, 'ironbindingcapacityuibc', 'ironbindingcapacityuibc', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Hematocrit aliases
  IF v_hematocrit_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_hematocrit_id, 'Hematocrit (HCT)', 'hematocrithct', 'en', 'lab_common'),
    (v_hematocrit_id, 'hematocrithct', 'hematocrithct', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Hemoglobin aliases
  IF v_hemoglobin_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_hemoglobin_id, 'Haemoglobin (g/L)', 'haemoglobingl', 'en', 'lab_common'),
    (v_hemoglobin_id, 'haemoglobingl', 'haemoglobingl', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Platelets aliases
  IF v_platelets_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_platelets_id, 'Platelets (PLT)', 'plateletsplt', 'en', 'lab_common'),
    (v_platelets_id, 'plateletsplt', 'plateletsplt', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  -- WBC Differential aliases
  IF v_lymphocytes_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_lymphocytes_id, 'Lymphocytes (LYM%)', 'lymphocyteslym', 'en', 'lab_common'),
    (v_lymphocytes_id, 'lymphocyteslym', 'lymphocyteslym', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_monocytes_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_monocytes_id, 'Monocytes (MON%)', 'monocytesmon', 'en', 'lab_common'),
    (v_monocytes_id, 'monocytesmon', 'monocytesmon', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_neutrophils_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_neutrophils_id, 'Neutrophils (NEU%)', 'neutrophilsneu', 'en', 'lab_common'),
    (v_neutrophils_id, 'neutrophilsneu', 'neutrophilsneu', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_eosinophils_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_eosinophils_id, 'Eosinophils (EOS%)', 'eosinophilseos', 'en', 'lab_common'),
    (v_eosinophils_id, 'eosinophilseos', 'eosinophilseos', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_basophils_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_basophils_id, 'Basophils (BAS%)', 'basophilsbas', 'en', 'lab_common'),
    (v_basophils_id, 'basophilsbas', 'basophilsbas', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;

  -- PSA Free aliases
  IF v_psa_free_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_psa_free_id, 'PSA Ratio', 'psaratio', 'en', 'lab_common'),
    (v_psa_free_id, 'psaratio', 'psaratio', 'en', 'lab_common')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Step 2: Create 8 new biomarkers
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, reference_ranges, data_type) VALUES
('estradiol', 'Estradiol (E2)', 'Hormones', 'pg/mL', '{"male": {"min": 10, "max": 40}, "female_follicular": {"min": 30, "max": 120}, "female_luteal": {"min": 70, "max": 250}}', 'quantitative'),
('rdw', 'Red Cell Distribution Width (RDW)', 'CBC', '%', '{"normal": {"min": 11.5, "max": 14.5}}', 'quantitative'),
('pdw', 'Platelet Distribution Width (PDW)', 'CBC', 'fL', '{"normal": {"min": 10, "max": 18}}', 'quantitative'),
('transferrin', 'Transferrin', 'Iron Studies', 'mg/dL', '{"normal": {"min": 200, "max": 360}}', 'quantitative'),
('cea', 'Carcinoembryonic Antigen (CEA)', 'Tumor Markers', 'ng/mL', '{"nonsmoker": {"min": 0, "max": 3}, "smoker": {"min": 0, "max": 5}}', 'quantitative'),
('free_testosterone', 'Free Testosterone', 'Hormones', 'pg/mL', '{"male": {"min": 50, "max": 200}, "female": {"min": 1, "max": 8.5}}', 'quantitative'),
('hdl_ratio', 'Total Cholesterol/HDL Ratio', 'Lipids', 'ratio', '{"optimal": {"min": 0, "max": 3.5}, "normal": {"min": 3.5, "max": 5}}', 'quantitative'),
('hcg_beta', 'Beta-hCG', 'Hormones', 'mIU/mL', '{"male": {"min": 0, "max": 5}, "female_non_pregnant": {"min": 0, "max": 5}}', 'quantitative')
ON CONFLICT (canonical_name) DO NOTHING;

-- Step 3: Add comprehensive aliases for new biomarkers
DO $$
DECLARE
  v_estradiol_id uuid;
  v_rdw_id uuid;
  v_pdw_id uuid;
  v_transferrin_id uuid;
  v_cea_id uuid;
  v_free_testosterone_id uuid;
  v_hdl_ratio_id uuid;
  v_hcg_beta_id uuid;
BEGIN
  SELECT id INTO v_estradiol_id FROM biomarker_master WHERE canonical_name = 'estradiol';
  SELECT id INTO v_rdw_id FROM biomarker_master WHERE canonical_name = 'rdw';
  SELECT id INTO v_pdw_id FROM biomarker_master WHERE canonical_name = 'pdw';
  SELECT id INTO v_transferrin_id FROM biomarker_master WHERE canonical_name = 'transferrin';
  SELECT id INTO v_cea_id FROM biomarker_master WHERE canonical_name = 'cea';
  SELECT id INTO v_free_testosterone_id FROM biomarker_master WHERE canonical_name = 'free_testosterone';
  SELECT id INTO v_hdl_ratio_id FROM biomarker_master WHERE canonical_name = 'hdl_ratio';
  SELECT id INTO v_hcg_beta_id FROM biomarker_master WHERE canonical_name = 'hcg_beta';

  -- Estradiol aliases (EN, FR, UA, RU)
  IF v_estradiol_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_estradiol_id, 'Estradiol', 'estradiol', 'en', 'standard'),
    (v_estradiol_id, 'Oestradiol', 'oestradiol', 'en', 'standard'),
    (v_estradiol_id, 'E2', 'e2', 'en', 'abbreviation'),
    (v_estradiol_id, 'Estrogen', 'estrogen', 'en', 'common'),
    (v_estradiol_id, 'Oestrogène', 'oestrogene', 'fr', 'standard'),
    (v_estradiol_id, 'Естрадіол', 'estradiol', 'ua', 'standard'),
    (v_estradiol_id, 'Эстрадиол', 'estradiol', 'ru', 'standard'),
    (v_estradiol_id, 'Естроген', 'estrogen', 'ua', 'common'),
    (v_estradiol_id, 'Эстроген', 'estrogen', 'ru', 'common'),
    (v_estradiol_id, '17-Beta Estradiol', '17betaestradiol', 'en', 'technical')
    ON CONFLICT DO NOTHING;
  END IF;

  -- RDW aliases
  IF v_rdw_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_rdw_id, 'RDW', 'rdw', 'en', 'abbreviation'),
    (v_rdw_id, 'RDW-CV', 'rdwcv', 'en', 'abbreviation'),
    (v_rdw_id, 'RDW-SD', 'rdwsd', 'en', 'abbreviation'),
    (v_rdw_id, 'Red Cell Distribution Width', 'redcelldistributionwidth', 'en', 'standard'),
    (v_rdw_id, 'Ширина розподілу еритроцитів', 'shyrynarozpodiluerytroczytiv', 'ua', 'standard'),
    (v_rdw_id, 'Ширина распределения эритроцитов', 'shyrynaraspredeleniyaerytroczytov', 'ru', 'standard'),
    (v_rdw_id, 'RDW-CD', 'rdwcd', 'en', 'abbreviation')
    ON CONFLICT DO NOTHING;
  END IF;

  -- PDW aliases
  IF v_pdw_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_pdw_id, 'PDW', 'pdw', 'en', 'abbreviation'),
    (v_pdw_id, 'Platelet Distribution Width', 'plateletdistributionwidth', 'en', 'standard'),
    (v_pdw_id, 'Ширина розподілу тромбоцитів', 'shyrynarozpodilutromboczytiv', 'ua', 'standard'),
    (v_pdw_id, 'Ширина распределения тромбоцитов', 'shyrynaraspredeleniyatromboczytov', 'ru', 'standard')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Transferrin aliases
  IF v_transferrin_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_transferrin_id, 'Transferrin', 'transferrin', 'en', 'standard'),
    (v_transferrin_id, 'Transferrine', 'transferrine', 'fr', 'standard'),
    (v_transferrin_id, 'Трансферин', 'transferrin', 'ua', 'standard'),
    (v_transferrin_id, 'Трансферрин', 'transferrin', 'ru', 'standard'),
    (v_transferrin_id, 'Serum Transferrin', 'serumtransferrin', 'en', 'lab_common'),
    (v_transferrin_id, 'TRF', 'trf', 'en', 'abbreviation')
    ON CONFLICT DO NOTHING;
  END IF;

  -- CEA aliases
  IF v_cea_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_cea_id, 'CEA', 'cea', 'en', 'abbreviation'),
    (v_cea_id, 'Carcinoembryonic Antigen', 'carcinoembryonicantigen', 'en', 'standard'),
    (v_cea_id, 'Antigène Carcino-Embryonnaire', 'antigencarcinoembryonnaire', 'fr', 'standard'),
    (v_cea_id, 'Раково-ембріональний антиген', 'rakvoembryonalnyjantygen', 'ua', 'standard'),
    (v_cea_id, 'Раково-эмбриональный антиген', 'rakvoembryonalnyjantigen', 'ru', 'standard'),
    (v_cea_id, 'Онкомаркер CEA', 'onkomarkercea', 'ru', 'common'),
    (v_cea_id, 'Онкомаркер РЕА', 'onkomarkerrea', 'ru', 'common')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Free Testosterone aliases
  IF v_free_testosterone_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_free_testosterone_id, 'Free Testosterone', 'freetestosterone', 'en', 'standard'),
    (v_free_testosterone_id, 'Testosterone Free', 'testosteronefree', 'en', 'standard'),
    (v_free_testosterone_id, 'Free T', 'freet', 'en', 'abbreviation'),
    (v_free_testosterone_id, 'Testostérone Libre', 'testosteronelibre', 'fr', 'standard'),
    (v_free_testosterone_id, 'Вільний тестостерон', 'vilnyjtestosteron', 'ua', 'standard'),
    (v_free_testosterone_id, 'Свободный тестостерон', 'svobodnyjte testosterone', 'ru', 'standard'),
    (v_free_testosterone_id, 'FT', 'ft', 'en', 'abbreviation')
    ON CONFLICT DO NOTHING;
  END IF;

  -- HDL Ratio aliases
  IF v_hdl_ratio_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_hdl_ratio_id, 'HDL Ratio', 'hdlratio', 'en', 'common'),
    (v_hdl_ratio_id, 'Total Cholesterol/HDL Ratio', 'totalcholesterolhdlratio', 'en', 'standard'),
    (v_hdl_ratio_id, 'TC/HDL Ratio', 'tchdlratio', 'en', 'abbreviation'),
    (v_hdl_ratio_id, 'Cholesterol Ratio', 'cholesterolratio', 'en', 'common'),
    (v_hdl_ratio_id, 'Коефіцієнт атерогенності', 'koeficzijentatrohennosti', 'ua', 'standard'),
    (v_hdl_ratio_id, 'Коэффициент атерогенности', 'koefficzientatrogennosti', 'ru', 'standard')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Beta-hCG aliases
  IF v_hcg_beta_id IS NOT NULL THEN
    INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
    (v_hcg_beta_id, 'Beta-hCG', 'betahcg', 'en', 'standard'),
    (v_hcg_beta_id, 'β-hCG', 'betahcg', 'en', 'standard'),
    (v_hcg_beta_id, 'Beta Human Chorionic Gonadotropin', 'betahumanchorionicgonadotropin', 'en', 'full'),
    (v_hcg_beta_id, 'hCG Beta', 'hcgbeta', 'en', 'common'),
    (v_hcg_beta_id, 'ХГЧ бета', 'hcgbeta', 'ru', 'standard'),
    (v_hcg_beta_id, 'ХГЧ β', 'hcgbeta', 'ru', 'standard'),
    (v_hcg_beta_id, 'b-hCG', 'bhcg', 'en', 'abbreviation')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Step 4: Rematch all NULL biomarker_id records
UPDATE lab_test_results ltr
SET biomarker_id = ba.biomarker_id
FROM biomarker_aliases ba
WHERE ltr.biomarker_id IS NULL
  AND normalize_biomarker_name(ltr.raw_test_name) = ba.alias_normalized;