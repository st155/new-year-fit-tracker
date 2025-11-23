import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function normalizeBiomarkerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[REMATCH-BIOMARKERS] Starting biomarker rematch');

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

    const { documentId } = await req.json();

    // Fetch all aliases for matching
    const { data: aliases, error: aliasesError } = await supabase
      .from('biomarker_aliases')
      .select('biomarker_id, alias_normalized');

    if (aliasesError) {
      console.error('[REMATCH-BIOMARKERS] Error fetching aliases:', aliasesError);
      throw aliasesError;
    }

    // Find all unmatched results for this document
    let query = supabase
      .from('lab_test_results')
      .select('*')
      .is('biomarker_id', null)
      .eq('user_id', user.id);

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    const { data: unmatched, error: unmatchedError } = await query;

    if (unmatchedError) {
      console.error('[REMATCH-BIOMARKERS] Error fetching unmatched results:', unmatchedError);
      throw unmatchedError;
    }

    if (!unmatched || unmatched.length === 0) {
      console.log('[REMATCH-BIOMARKERS] No unmatched results found');
      return new Response(
        JSON.stringify({
          success: true,
          rematchedCount: 0,
          totalUnmatched: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let rematchedCount = 0;

    console.log(`[REMATCH-BIOMARKERS] Found ${unmatched.length} unmatched results`);

    // Try to rematch each unmatched result
    for (const result of unmatched) {
      const normalized = normalizeBiomarkerName(result.raw_test_name);
      
      const match = aliases?.find(a => a.alias_normalized === normalized);
      
      if (match) {
        const { error: updateError } = await supabase
          .from('lab_test_results')
          .update({ biomarker_id: match.biomarker_id })
          .eq('id', result.id);
        
        if (updateError) {
          console.error(`[REMATCH-BIOMARKERS] Error updating result ${result.id}:`, updateError);
        } else {
          rematchedCount++;
          console.log(`[REMATCH-BIOMARKERS] ✓ Re-matched: ${result.raw_test_name} → ${match.biomarker_id}`);
        }
      }
    }

    console.log(`[REMATCH-BIOMARKERS] ✓ Completed! Re-matched ${rematchedCount} out of ${unmatched.length} results`);

    return new Response(
      JSON.stringify({
        success: true,
        rematchedCount,
        totalUnmatched: unmatched.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[REMATCH-BIOMARKERS] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
