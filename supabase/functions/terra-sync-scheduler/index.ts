import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Terra sync scheduler started');

    // Получаем всех пользователей с активными Terra токенами
    const { data: users, error: usersError } = await supabase
      .from('terra_tokens')
      .select('user_id, provider')
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ Error fetching Terra users:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log('⚠️ No active Terra users found');
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'No active users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${users.length} active Terra users, starting sync...`);

    // Группируем по user_id (один пользователь может иметь несколько провайдеров)
    const uniqueUserIds = [...new Set(users.map(u => u.user_id))];
    
    let successCount = 0;
    let errorCount = 0;

    // Запускаем sync-data для каждого уникального пользователя
    for (const userId of uniqueUserIds) {
      try {
        console.log(`🔄 Syncing Terra data for user: ${userId}`);
        
        const { data, error } = await supabase.functions.invoke('terra-integration', {
          body: { 
            action: 'sync-data', 
            userId: userId  // Передаем userId напрямую для обхода JWT аутентификации
          }
        });

        if (error) {
          console.error(`❌ Sync failed for user ${userId}:`, error);
          errorCount++;
        } else {
          console.log(`✅ Sync completed for user ${userId}`);
          successCount++;
        }
      } catch (e) {
        console.error(`❌ Exception during sync for user ${userId}:`, e);
        errorCount++;
      }
    }

    console.log(`✅ Terra sync scheduler completed: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: successCount,
        errors: errorCount,
        total: uniqueUserIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Terra sync scheduler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
