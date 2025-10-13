import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-whoop-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('🔔 Whoop webhook received:', payload);

    // Обработка webhook от Whoop
    if (payload.type === 'user.updated') {
      const whoopUserId = payload.user_id;
      
      // Находим пользователя по whoop_user_id
      const { data: tokenData } = await supabase
        .from('whoop_tokens')
        .select('user_id, access_token')
        .eq('whoop_user_id', whoopUserId)
        .eq('is_active', true)
        .maybeSingle();

      if (tokenData) {
        console.log(`✅ Triggering sync for user ${tokenData.user_id}`);
        
        // Вызываем функцию синхронизации
        await supabase.functions.invoke('whoop-integration', {
          body: {
            action: 'sync-data',
            userId: tokenData.user_id,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Whoop webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
