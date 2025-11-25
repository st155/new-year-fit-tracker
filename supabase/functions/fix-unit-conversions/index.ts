import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[FIX-UNIT-CONVERSIONS] Starting unit conversion fix');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[FIX-UNIT-CONVERSIONS] Processing for user ${user.id}`);

    // Fetch all biomarkers with conversion factors
    const { data: biomarkers, error: bioError } = await supabase
      .from('biomarker_master')
      .select('id, canonical_name, standard_unit, conversion_factors');

    if (bioError) throw bioError;
    
    console.log(`[FIX-UNIT-CONVERSIONS] Found ${biomarkers?.length} biomarkers with conversion factors`);

    // Fetch all lab test results for this user that need recalculation
    const { data: results, error: resultsError } = await supabase
      .from('lab_test_results')
      .select('id, biomarker_id, value, unit, normalized_value')
      .eq('user_id', user.id)
      .not('biomarker_id', 'is', null)
      .not('value', 'is', null);

    if (resultsError) throw resultsError;

    console.log(`[FIX-UNIT-CONVERSIONS] Found ${results?.length} test results to check`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each result
    for (const result of results || []) {
      const biomarker = biomarkers?.find(b => b.id === result.biomarker_id);
      
      if (!biomarker) {
        skippedCount++;
        continue;
      }

      const conversionFactors = biomarker.conversion_factors || {};
      
      // Normalize unit variations (mmol/l, Mmol/L, ммоль/л → mmol/L)
      const normalizedSourceUnit = normalizeUnit(result.unit);
      
      // Check if conversion is needed
      if (normalizedSourceUnit === biomarker.standard_unit || !conversionFactors[normalizedSourceUnit]) {
        // No conversion needed or no conversion factor available
        skippedCount++;
        continue;
      }

      // Recalculate normalized_value with correct formula
      const conversionFactor = conversionFactors[normalizedSourceUnit];
      const newNormalizedValue = result.value * conversionFactor;

      console.log(`[FIX-UNIT-CONVERSIONS] Recalculating ${biomarker.canonical_name}: ${result.value} ${normalizedSourceUnit} * ${conversionFactor} = ${newNormalizedValue} ${biomarker.standard_unit}`);

      // Update the record
      const { error: updateError } = await supabase
        .from('lab_test_results')
        .update({
          normalized_value: newNormalizedValue,
          normalized_unit: biomarker.standard_unit,
          unit: normalizedSourceUnit // Normalize the unit spelling too
        })
        .eq('id', result.id);

      if (updateError) {
        console.error(`[FIX-UNIT-CONVERSIONS] Error updating result ${result.id}:`, updateError);
        skippedCount++;
      } else {
        updatedCount++;
      }
    }

    console.log(`[FIX-UNIT-CONVERSIONS] ✓ Complete: ${updatedCount} updated, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        skipped: skippedCount,
        total: results?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[FIX-UNIT-CONVERSIONS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to normalize unit spelling variations
function normalizeUnit(unit: string): string {
  if (!unit) return unit;
  
  const unitMap: Record<string, string> = {
    // mmol/L variations
    'mmol/l': 'mmol/L',
    'Mmol/L': 'mmol/L',
    'MMOL/L': 'mmol/L',
    'ммоль/л': 'mmol/L',
    'ммоль/Л': 'mmol/L',
    
    // mg/dL variations
    'mg/dl': 'mg/dL',
    'Mg/dL': 'mg/dL',
    'MG/DL': 'mg/dL',
    'мг/дл': 'mg/dL',
    
    // µmol/L variations
    'umol/L': 'µmol/L',
    'µmol/l': 'µmol/L',
    'мкмоль/л': 'µmol/L',
  };
  
  return unitMap[unit] || unit;
}
