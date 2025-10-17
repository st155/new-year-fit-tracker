import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-whoop-signature',
};

serve(async (req) => {
  // Log incoming request
  console.log('🌐 Incoming Whoop webhook request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('📦 Whoop webhook payload received:', JSON.stringify(payload, null, 2));

    // Проверяем тип события
    const eventType = payload.type;
    console.log(`📋 Event type: ${eventType}`);

    // Поддерживаемые типы событий
    const supportedEvents = [
      'recovery.updated',
      'sleep.updated', 
      'workout.updated',
      'cycle.updated',
      'body_measurement.updated',
      'user.updated' // старый формат, на всякий случай
    ];

    if (!supportedEvents.includes(eventType)) {
      console.log(`⚠️ Unsupported event type: ${eventType}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Event type ${eventType} not handled` 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Получаем user_id из payload (может быть в разных форматах)
    const whoopUserId = payload.user_id || payload.user?.id;
    
    if (!whoopUserId) {
      console.error('❌ No user_id found in payload');
      return new Response(
        JSON.stringify({ error: 'No user_id in payload' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Looking for user with whoop_user_id: ${whoopUserId}`);

    // Находим пользователя по whoop_user_id
    const { data: tokenData, error: tokenError } = await supabase
      .from('whoop_tokens')
      .select('user_id, access_token, whoop_user_id')
      .eq('whoop_user_id', whoopUserId)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError) {
      console.error('❌ Error fetching token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: tokenError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!tokenData) {
      console.log(`⚠️ No active token found for whoop_user_id: ${whoopUserId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User not found or token inactive' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Found user: ${tokenData.user_id}, triggering sync...`);
    
    // Вызываем функцию синхронизации
    const { data: syncResult, error: syncError } = await supabase.functions.invoke('whoop-integration', {
      body: {
        action: 'sync',
        userId: tokenData.user_id,
      },
    });

    if (syncError) {
      console.error('❌ Sync function error:', syncError);
      return new Response(
        JSON.stringify({ 
          error: 'Sync failed', 
          details: syncError.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Sync triggered successfully:', syncResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventType,
        userId: tokenData.user_id,
        syncResult 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Whoop webhook error:', error);
    console.error('Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
