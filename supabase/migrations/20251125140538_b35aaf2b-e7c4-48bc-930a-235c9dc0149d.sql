-- Add fitness biomarkers to biomarker_master for VO2max and exercise tests
INSERT INTO biomarker_master (
  canonical_name,
  display_name,
  category,
  standard_unit,
  data_type,
  reference_ranges,
  description,
  clinical_significance
) VALUES
(
  'vo2max',
  'VO2max',
  'Cardiorespiratory',
  'ml/kg/min',
  'quantitative',
  '{"male": {"18-25": {"min": 42, "max": 56}, "26-35": {"min": 40, "max": 54}, "36-45": {"min": 38, "max": 51}, "46-55": {"min": 36, "max": 48}, "56-65": {"min": 32, "max": 44}, "65+": {"min": 26, "max": 38}}, "female": {"18-25": {"min": 38, "max": 52}, "26-35": {"min": 36, "max": 49}, "36-45": {"min": 33, "max": 45}, "46-55": {"min": 30, "max": 42}, "56-65": {"min": 26, "max": 38}, "65+": {"min": 20, "max": 32}}}'::jsonb,
  'Maximal oxygen uptake - measure of aerobic fitness and cardiovascular endurance',
  'Higher values indicate better cardiovascular fitness. Elite endurance athletes can exceed 70 ml/kg/min.'
),
(
  'lactate_threshold_hr',
  'Lactate Threshold HR',
  'Metabolic',
  'bpm',
  'quantitative',
  '{"general": {"min": 140, "max": 180}}'::jsonb,
  'Heart rate at lactate threshold - the point where lactate begins to accumulate in blood',
  'Training at or near lactate threshold improves endurance performance. Typically 75-85% of max HR.'
),
(
  'anaerobic_threshold_power',
  'Anaerobic Threshold Power',
  'Performance',
  'W',
  'quantitative',
  '{"general": {"min": 150, "max": 400}}'::jsonb,
  'Power output at anaerobic threshold',
  'Key metric for cycling and endurance sports. Higher values indicate better endurance capacity.'
),
(
  'max_heart_rate',
  'Max Heart Rate',
  'Cardiorespiratory',
  'bpm',
  'quantitative',
  '{"general": {"min": 160, "max": 200}}'::jsonb,
  'Maximum heart rate achieved during exercise test',
  'Used to calculate training zones. Typically estimated as 220 - age, but actual measurement is more accurate.'
)
ON CONFLICT (canonical_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  standard_unit = EXCLUDED.standard_unit,
  data_type = EXCLUDED.data_type,
  reference_ranges = EXCLUDED.reference_ranges,
  description = EXCLUDED.description,
  clinical_significance = EXCLUDED.clinical_significance;