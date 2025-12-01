-- Fix team_members RLS policy infinite recursion
-- Instead of querying team_members table in RLS policy, use a security definer function

-- Drop existing policies
DROP POLICY IF EXISTS "Team members can view their own data" ON public.team_members;
DROP POLICY IF EXISTS "Team members can update their own data" ON public.team_members;

-- Create security definer function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
  )
$$;

-- Create new policies using the security definer function
CREATE POLICY "Team members can view their own data"
ON public.team_members
FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can update their own data"
ON public.team_members
FOR UPDATE
USING (public.is_team_member(auth.uid(), team_id));

-- Reset stuck medical documents from 'processing' to 'pending'
-- This allows them to be reprocessed
UPDATE public.medical_documents
SET processing_status = 'pending',
    updated_at = now()
WHERE processing_status = 'processing'
  AND updated_at < now() - INTERVAL '1 hour';

-- Add aliases for VO2max and fitness metrics, fatty acids, and other unmatched biomarkers

-- VO2max variants
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
((SELECT id FROM biomarker_master WHERE canonical_name = 'vo2max'), 'VO2 (mL/kg*min)', 'vo2 (ml/kg*min)', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'vo2max'), 'VO2 (mL/min)', 'vo2 (ml/min)', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'vo2max'), 'VCO2 (ml/min)', 'vco2 (ml/min)', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'vo2max'), 'VO2MAX', 'vo2max', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'vo2max'), 'VO2 Max', 'vo2 max', 'en', 'lab_import');

-- HDL ratio variants
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
((SELECT id FROM biomarker_master WHERE canonical_name = 'cholesterol_hdl'), 'HDL % of total', 'hdl % of total', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'cholesterol_hdl'), 'HDL Percentage', 'hdl percentage', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'cholesterol_hdl'), '% HDL', '% hdl', 'en', 'lab_import');

-- LDL ratio variants
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
((SELECT id FROM biomarker_master WHERE canonical_name = 'cholesterol_ldl'), 'LDL % of total', 'ldl % of total', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'cholesterol_ldl'), 'LDL Percentage', 'ldl percentage', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'cholesterol_ldl'), '% LDL', '% ldl', 'en', 'lab_import');

-- Bilirubin Indirect variants
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
((SELECT id FROM biomarker_master WHERE canonical_name = 'bilirubin_indirect'), 'Bilirubin Indirect', 'bilirubin indirect', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'bilirubin_indirect'), 'Indirect Bilirubin', 'indirect bilirubin', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'bilirubin_indirect'), 'Bilirubine Indirecte', 'bilirubine indirecte', 'fr', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'bilirubin_indirect'), 'Непрямой билирубин', 'непрямой билирубин', 'ru', 'lab_import');

-- Create new biomarkers for fatty acids if they don't exist
INSERT INTO biomarker_master (canonical_name, display_name, category, standard_unit, data_type, reference_ranges)
VALUES
  ('alpha_linolenic_acid', 'Alpha-Linolenic Acid (ALA)', 'Fatty Acids', 'µmol/L', 'quantitative', '{"adult": {"male": {"min": 100, "max": 300}, "female": {"min": 100, "max": 300}}}'::jsonb),
  ('epa', 'Eicosapentaenoic Acid (EPA)', 'Fatty Acids', 'µmol/L', 'quantitative', '{"adult": {"male": {"min": 30, "max": 150}, "female": {"min": 30, "max": 150}}}'::jsonb),
  ('dha', 'Docosahexaenoic Acid (DHA)', 'Fatty Acids', 'µmol/L', 'quantitative', '{"adult": {"male": {"min": 120, "max": 220}, "female": {"min": 120, "max": 220}}}'::jsonb),
  ('vitamin_b6', 'Vitamin B6 (Pyridoxine)', 'Vitamins', 'nmol/L', 'quantitative', '{"adult": {"male": {"min": 20, "max": 125}, "female": {"min": 20, "max": 125}}}'::jsonb)
ON CONFLICT (canonical_name) DO NOTHING;

-- Add aliases for newly created biomarkers
INSERT INTO biomarker_aliases (biomarker_id, alias, alias_normalized, language, source) VALUES
((SELECT id FROM biomarker_master WHERE canonical_name = 'alpha_linolenic_acid'), 'ALA', 'ala', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'alpha_linolenic_acid'), '18:3w3', '18:3w3', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'alpha_linolenic_acid'), 'Alpha Linolenic', 'alpha linolenic', 'en', 'lab_import'),

((SELECT id FROM biomarker_master WHERE canonical_name = 'epa'), 'EPA', 'epa', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'epa'), '20:5w3', '20:5w3', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'epa'), 'Eicosapentaenoic', 'eicosapentaenoic', 'en', 'lab_import'),

((SELECT id FROM biomarker_master WHERE canonical_name = 'dha'), 'DHA', 'dha', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'dha'), '22:6w3', '22:6w3', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'dha'), 'Docosahexaenoic', 'docosahexaenoic', 'en', 'lab_import'),

((SELECT id FROM biomarker_master WHERE canonical_name = 'vitamin_b6'), 'Vitamin B6', 'vitamin b6', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'vitamin_b6'), 'B6', 'b6', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'vitamin_b6'), 'Pyridoxine', 'pyridoxine', 'en', 'lab_import'),
((SELECT id FROM biomarker_master WHERE canonical_name = 'vitamin_b6'), 'Витамин B6', 'витамин b6', 'ru', 'lab_import');