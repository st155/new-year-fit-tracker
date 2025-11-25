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

  console.log('[RECLASSIFY-IMAGING] Starting reclassification of imaging documents');

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

    console.log(`[RECLASSIFY-IMAGING] Processing documents for user ${user.id}`);

    // Imaging keywords in multiple languages
    const imagingKeywords = [
      'узи', 'мрт', 'кт', 'рентген', 'томография',
      'ultrasound', 'mri', 'ct scan', 'x-ray', 'tomography',
      'органов', 'gastro', 'эндоскопия', 'endoscopy',
      'колоноскопия', 'colonoscopy', 'эхокг', 'echocardiography',
      'малого таза', 'pelvis', 'брюшной полости', 'abdomen',
      'молочных желез', 'breast', 'щитовидной', 'thyroid'
    ];

    // Build OR condition for filename matching
    const orConditions = imagingKeywords
      .map(kw => `file_name.ilike.%${kw}%`)
      .join(',');

    // Find all documents that match imaging keywords but aren't classified as imaging_report
    const { data: candidates, error: fetchError } = await supabase
      .from('medical_documents')
      .select('id, file_name, category, ai_summary')
      .eq('user_id', user.id)
      .neq('category', 'imaging_report')
      .or(orConditions);

    if (fetchError) {
      console.error('[RECLASSIFY-IMAGING] Error fetching candidates:', fetchError);
      throw fetchError;
    }

    if (!candidates || candidates.length === 0) {
      console.log('[RECLASSIFY-IMAGING] No documents to reclassify');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No documents need reclassification',
          reclassified: 0,
          documents: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RECLASSIFY-IMAGING] Found ${candidates.length} candidates for reclassification`);

    // Reclassify all candidates to imaging_report
    const documentIds = candidates.map(doc => doc.id);
    
    const { error: updateError } = await supabase
      .from('medical_documents')
      .update({ category: 'imaging_report' })
      .in('id', documentIds);

    if (updateError) {
      console.error('[RECLASSIFY-IMAGING] Error updating documents:', updateError);
      throw updateError;
    }

    const reclassifiedDocs = candidates.map(doc => ({
      id: doc.id,
      file_name: doc.file_name,
      old_category: doc.category
    }));

    console.log(`[RECLASSIFY-IMAGING] ✅ Successfully reclassified ${reclassifiedDocs.length} documents`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reclassified ${reclassifiedDocs.length} documents to imaging_report`,
        reclassified: reclassifiedDocs.length,
        documents: reclassifiedDocs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[RECLASSIFY-IMAGING] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
