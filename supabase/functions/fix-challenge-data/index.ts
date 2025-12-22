import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting data fix operations...');

    // Step 1: Fix discipline positions for challenge a5b003da-a578-4142-a5e7-11d69474154a
    const { error: pos1Error } = await supabase
      .from('challenge_disciplines')
      .update({ position: 1 })
      .eq('id', 'cf47b5d3-23d8-49aa-b298-03d3178a7911');
    
    const { error: pos2Error } = await supabase
      .from('challenge_disciplines')
      .update({ position: 2 })
      .eq('id', '45d5b5de-aa76-4cc8-844f-5ba426406476');
    
    const { error: pos3Error } = await supabase
      .from('challenge_disciplines')
      .update({ position: 3 })
      .eq('id', 'ec8dc3bd-3376-4849-9d3d-ca2271d003df');
    
    const { error: pos4Error } = await supabase
      .from('challenge_disciplines')
      .update({ position: 4 })
      .eq('id', '63a27f91-205c-4f60-a3eb-961433e5281b');

    // Step 2: Fix discipline positions for challenge b8e61c3c-87ec-43be-b767-af8f1f658990
    const { error: pos5Error } = await supabase
      .from('challenge_disciplines')
      .update({ position: 1 })
      .eq('id', 'fc333b65-3017-43dd-87db-01429ed2aa07');
    
    const { error: pos6Error } = await supabase
      .from('challenge_disciplines')
      .update({ position: 2 })
      .eq('id', 'cd73b005-77b6-4552-9800-43314048615f');
    
    const { error: pos7Error } = await supabase
      .from('challenge_disciplines')
      .update({ position: 3 })
      .eq('id', '3568976c-c7c7-42bb-b411-8c77b8c1574e');
    
    const { error: pos8Error } = await supabase
      .from('challenge_disciplines')
      .update({ position: 4 })
      .eq('id', 'a2c001e5-23fc-41ff-90a0-807228e71afd');

    console.log('✅ Fixed discipline positions');

    // Step 3: Delete duplicate goals for Sergey Tokarev
    const duplicateGoalIds = [
      'ef3b9d7c-3815-46f1-a3f8-62f4dc7ea6d6',
      '30a9b6ba-cf5e-4d6f-854a-d4c6ef90d20e',
      'd9e2127f-c7d0-40e5-baa2-0d94a1bc5fc9',
      '58fa0f16-ba07-4940-9023-98440f4be79f',
      'b8ca5a6a-94f5-4b07-b8d6-cb87309b2b57',
      '469879ac-4708-40fa-82e9-0e2377296f1a',
      'ff41b763-fd47-4a27-b4f4-35fc92a0c11a',
      '76059756-396b-4963-b8ff-bddaa51fe529'
    ];

    const { error: deleteError } = await supabase
      .from('goals')
      .delete()
      .in('id', duplicateGoalIds);

    if (deleteError) {
      console.error('Error deleting duplicate goals:', deleteError);
    } else {
      console.log(`✅ Deleted ${duplicateGoalIds.length} duplicate goals`);
    }

    // Step 4: Activate Terra tokens for Alexey Gubarev (WHOOP + WITHINGS)
    const { error: activateError1 } = await supabase
      .from('terra_tokens')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('user_id', 'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae')
      .eq('provider', 'WHOOP');

    const { error: activateError2 } = await supabase
      .from('terra_tokens')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('user_id', 'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae')
      .eq('provider', 'WITHINGS');

    console.log('✅ Activated Terra tokens for Alexey Gubarev', { activateError1, activateError2 });

    const result = {
      success: true,
      operations: {
        disciplinePositionsFixed: 8,
        duplicateGoalsDeleted: duplicateGoalIds.length,
        terraTokensActivated: 2
      },
      errors: {
        positions: [pos1Error, pos2Error, pos3Error, pos4Error, pos5Error, pos6Error, pos7Error, pos8Error].filter(e => e),
        deleteGoals: deleteError ? [deleteError] : [],
        activateTokens: [activateError1, activateError2].filter(e => e)
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fix operation error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
