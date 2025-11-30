import { createServiceClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    
    console.log('[FIX_DUPLICATES] Starting duplicate lab results cleanup');

    // Find biomarkers that should be in mmol/L (cholesterol and triglycerides)
    const { data: biomarkers, error: biomarkerError } = await supabase
      .from('biomarker_master')
      .select('id, canonical_name')
      .in('canonical_name', [
        'cholesterol_total',
        'cholesterol_ldl',
        'cholesterol_hdl',
        'triglycerides'
      ]);

    if (biomarkerError) throw biomarkerError;

    const biomarkerIds = biomarkers?.map(b => b.id) || [];
    console.log(`[FIX_DUPLICATES] Found ${biomarkerIds.length} cholesterol/triglyceride biomarkers`);

    // Find problematic records where unit is mg/dL but value wasn't converted
    // These records have normalized_value = value (no conversion applied)
    // Correct cholesterol values in mmol/L should be < 15
    const { data: problematicRecords, error: fetchError } = await supabase
      .from('lab_test_results')
      .select('id, biomarker_id, raw_test_name, value, normalized_value, unit, measurement_date')
      .in('biomarker_id', biomarkerIds)
      .eq('unit', 'mg/dL')
      .gt('normalized_value', 15); // Unrealistic values in mmol/L

    if (fetchError) throw fetchError;

    console.log(`[FIX_DUPLICATES] Found ${problematicRecords?.length || 0} problematic records`);

    if (!problematicRecords || problematicRecords.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No problematic records found',
          deleted: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by measurement_date and biomarker_id to find duplicates
    const duplicateGroups = new Map<string, typeof problematicRecords>();
    
    for (const record of problematicRecords) {
      const key = `${record.measurement_date}_${record.biomarker_id}`;
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(record);
    }

    console.log(`[FIX_DUPLICATES] Found ${duplicateGroups.size} date-biomarker groups with issues`);

    let deletedCount = 0;
    const deletedRecords = [];

    // For each group, check if there's a good record (< 15 mmol/L)
    for (const [key, records] of duplicateGroups.entries()) {
      const [date, biomarkerId] = key.split('_');
      
      // Check if there's a good record for this date/biomarker
      const { data: goodRecords } = await supabase
        .from('lab_test_results')
        .select('id, normalized_value')
        .eq('measurement_date', date)
        .eq('biomarker_id', biomarkerId)
        .lt('normalized_value', 15);

      // If there's a good record, delete the bad ones
      if (goodRecords && goodRecords.length > 0) {
        for (const badRecord of records) {
          const { error: deleteError } = await supabase
            .from('lab_test_results')
            .delete()
            .eq('id', badRecord.id);

          if (!deleteError) {
            deletedCount++;
            deletedRecords.push({
              id: badRecord.id,
              name: badRecord.raw_test_name,
              badValue: badRecord.normalized_value,
              date: badRecord.measurement_date,
            });
            console.log(`[FIX_DUPLICATES] ✅ Deleted: ${badRecord.raw_test_name} = ${badRecord.normalized_value} on ${badRecord.measurement_date}`);
          } else {
            console.error(`[FIX_DUPLICATES] ❌ Failed to delete ${badRecord.id}:`, deleteError);
          }
        }
      } else {
        console.log(`[FIX_DUPLICATES] ⚠️ No good record found for ${key}, keeping bad records`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully cleaned up ${deletedCount} duplicate/incorrect lab results`,
        deleted: deletedCount,
        details: deletedRecords,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FIX_DUPLICATES] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
