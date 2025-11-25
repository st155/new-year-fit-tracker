-- Add missing biomarkers to biomarker_master
INSERT INTO biomarker_master (
  canonical_name, display_name, category, standard_unit, 
  data_type, reference_ranges, description
) VALUES
  -- Hormones
  ('lh', 'LH (Luteinising Hormone)', 'hormones', 'mIU/mL', 'quantitative',
   '{"male": {"min": 1.7, "max": 8.6}, "female_follicular": {"min": 2.4, "max": 12.6}, "female_ovulatory": {"min": 14.0, "max": 95.6}, "female_luteal": {"min": 1.0, "max": 11.4}}'::jsonb,
   'Luteinising hormone stimulates ovulation in females and testosterone production in males'),
   
  ('fsh', 'FSH (Follicle Stimulating Hormone)', 'hormones', 'mIU/mL', 'quantitative',
   '{"male": {"min": 1.5, "max": 12.4}, "female_follicular": {"min": 3.5, "max": 12.5}, "female_ovulatory": {"min": 4.7, "max": 21.5}, "female_luteal": {"min": 1.7, "max": 7.7}}'::jsonb,
   'Follicle-stimulating hormone regulates reproductive processes'),
   
  ('shbg', 'SHBG (Sex Hormone Binding Globulin)', 'hormones', 'nmol/L', 'quantitative',
   '{"male": {"min": 13.0, "max": 71.0}, "female": {"min": 18.0, "max": 114.0}}'::jsonb,
   'Protein that binds to sex hormones including testosterone and estrogen'),
   
  ('prolactin', 'Prolactin', 'hormones', 'ng/mL', 'quantitative',
   '{"male": {"min": 4.0, "max": 15.2}, "female": {"min": 4.8, "max": 23.3}}'::jsonb,
   'Hormone that stimulates milk production and plays a role in reproductive health'),
   
  -- Tumor markers
  ('psa_total', 'PSA Total', 'tumor_markers', 'ng/mL', 'quantitative',
   '{"male": {"min": 0.0, "max": 4.0}}'::jsonb,
   'Prostate-specific antigen, used for prostate cancer screening'),
   
  ('psa_free', 'PSA Free', 'tumor_markers', 'ng/mL', 'quantitative',
   '{"male": {"min": 0.0, "max": 1.0}}'::jsonb,
   'Free (unbound) prostate-specific antigen, ratio with total PSA helps assess cancer risk'),
   
  -- Cardiac markers
  ('lp_pla2', 'Lp-PLA2', 'cardiac_markers', 'ng/mL', 'quantitative',
   '{"optimal": {"min": 0, "max": 200}}'::jsonb,
   'Lipoprotein-associated phospholipase A2, cardiovascular disease risk marker')
ON CONFLICT (canonical_name) DO NOTHING;