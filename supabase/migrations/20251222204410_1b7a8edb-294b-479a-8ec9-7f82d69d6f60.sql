-- Create supplement_synonyms table for improved matching
CREATE TABLE public.supplement_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL,
    synonym TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    confidence NUMERIC DEFAULT 0.9,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(canonical_name, synonym)
);

-- Enable RLS
ALTER TABLE public.supplement_synonyms ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read synonyms (public knowledge base)
CREATE POLICY "Anyone can read supplement synonyms"
ON public.supplement_synonyms
FOR SELECT
USING (true);

-- Only authenticated users can insert (for future crowdsourcing)
CREATE POLICY "Authenticated users can insert synonyms"
ON public.supplement_synonyms
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for fast lookups
CREATE INDEX idx_supplement_synonyms_canonical ON public.supplement_synonyms(canonical_name);
CREATE INDEX idx_supplement_synonyms_synonym ON public.supplement_synonyms(synonym);
CREATE INDEX idx_supplement_synonyms_synonym_lower ON public.supplement_synonyms(LOWER(synonym));

-- Insert common synonyms
INSERT INTO public.supplement_synonyms (canonical_name, synonym, language, confidence) VALUES
-- Magnesium forms
('magnesium_glycinate', 'Magnesium Glycinate', 'en', 1.0),
('magnesium_glycinate', 'Магний глицинат', 'ru', 1.0),
('magnesium_glycinate', 'Magnesium Citrate', 'en', 0.8),
('magnesium_glycinate', 'Магний цитрат', 'ru', 0.8),
('magnesium_glycinate', 'Magnesium', 'en', 0.7),
('magnesium_glycinate', 'Магний', 'ru', 0.7),
('magnesium_glycinate', 'Mag Glycinate', 'en', 0.95),
('magnesium_glycinate', 'Magnesium Threonate', 'en', 0.75),
('magnesium_glycinate', 'Магний L-треонат', 'ru', 0.75),

-- Omega-3
('omega3_epa_dha', 'Omega-3', 'en', 1.0),
('omega3_epa_dha', 'Омега-3', 'ru', 1.0),
('omega3_epa_dha', 'Fish Oil', 'en', 0.95),
('omega3_epa_dha', 'Рыбий жир', 'ru', 0.95),
('omega3_epa_dha', 'EPA/DHA', 'en', 1.0),
('omega3_epa_dha', 'Omega 3 Fish Oil', 'en', 0.95),
('omega3_epa_dha', 'Krill Oil', 'en', 0.9),

-- Vitamin D3
('vitamin_d3', 'Vitamin D3', 'en', 1.0),
('vitamin_d3', 'Витамин D3', 'ru', 1.0),
('vitamin_d3', 'Vitamin D', 'en', 0.95),
('vitamin_d3', 'Витамин Д', 'ru', 0.95),
('vitamin_d3', 'Cholecalciferol', 'en', 1.0),
('vitamin_d3', 'D3 5000IU', 'en', 0.9),

-- Vitamin B12
('vitamin_b12', 'Vitamin B12', 'en', 1.0),
('vitamin_b12', 'Витамин B12', 'ru', 1.0),
('vitamin_b12', 'B12', 'en', 1.0),
('vitamin_b12', 'Methylcobalamin', 'en', 1.0),
('vitamin_b12', 'Метилкобаламин', 'ru', 1.0),
('vitamin_b12', 'Cyanocobalamin', 'en', 0.9),

-- Iron
('iron_bisglycinate', 'Iron', 'en', 0.9),
('iron_bisglycinate', 'Железо', 'ru', 0.9),
('iron_bisglycinate', 'Iron Bisglycinate', 'en', 1.0),
('iron_bisglycinate', 'Бисглицинат железа', 'ru', 1.0),
('iron_bisglycinate', 'Ferrous Bisglycinate', 'en', 1.0),

-- Zinc
('zinc_picolinate', 'Zinc', 'en', 0.9),
('zinc_picolinate', 'Цинк', 'ru', 0.9),
('zinc_picolinate', 'Zinc Picolinate', 'en', 1.0),
('zinc_picolinate', 'Пиколинат цинка', 'ru', 1.0),

-- CoQ10
('coenzyme_q10', 'CoQ10', 'en', 1.0),
('coenzyme_q10', 'Coenzyme Q10', 'en', 1.0),
('coenzyme_q10', 'Коэнзим Q10', 'ru', 1.0),
('coenzyme_q10', 'Ubiquinol', 'en', 0.95),
('coenzyme_q10', 'Убихинол', 'ru', 0.95),

-- Probiotics
('probiotics', 'Probiotics', 'en', 1.0),
('probiotics', 'Пробиотики', 'ru', 1.0),
('probiotics', 'Lactobacillus', 'en', 0.9),
('probiotics', 'Bifidobacterium', 'en', 0.9),

-- Curcumin
('curcumin', 'Curcumin', 'en', 1.0),
('curcumin', 'Куркумин', 'ru', 1.0),
('curcumin', 'Turmeric', 'en', 0.9),
('curcumin', 'Куркума', 'ru', 0.9),

-- Ashwagandha
('ashwagandha', 'Ashwagandha', 'en', 1.0),
('ashwagandha', 'Ашваганда', 'ru', 1.0),
('ashwagandha', 'KSM-66', 'en', 0.95),
('ashwagandha', 'Withania Somnifera', 'en', 1.0),

-- Creatine
('creatine_monohydrate', 'Creatine', 'en', 1.0),
('creatine_monohydrate', 'Креатин', 'ru', 1.0),
('creatine_monohydrate', 'Creatine Monohydrate', 'en', 1.0),
('creatine_monohydrate', 'Креатин моногидрат', 'ru', 1.0);

-- Add trigger for updated_at
CREATE TRIGGER update_supplement_synonyms_updated_at
    BEFORE UPDATE ON public.supplement_synonyms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_suggestions_updated_at();