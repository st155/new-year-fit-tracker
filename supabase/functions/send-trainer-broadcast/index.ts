import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendBroadcastRequest {
  broadcastId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { broadcastId }: SendBroadcastRequest = await req.json();

    if (!broadcastId) {
      return new Response(
        JSON.stringify({ error: "Broadcast ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Получаем данные рассылки
    const { data: broadcast, error: broadcastError } = await supabaseClient
      .from('trainer_broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single();

    if (broadcastError || !broadcast) {
      return new Response(
        JSON.stringify({ error: "Broadcast not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Получаем получателей в зависимости от типа
    let recipients: any[] = [];

    if (broadcast.recipient_type === 'all_clients') {
      // Все клиенты тренера
      const { data: clients, error } = await supabaseClient
        .from('trainer_clients')
        .select(`
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name
          )
        `)
        .eq('trainer_id', broadcast.trainer_id)
        .eq('active', true);

      if (!error && clients) {
        recipients = clients.map((tc: any) => ({
          user_id: tc.profiles.user_id,
          username: tc.profiles.username,
          email: `${tc.profiles.username}@example.com` // Предполагаем, что username это email
        }));
      }
    } else if (broadcast.recipient_type === 'challenge_participants' && broadcast.challenge_id) {
      // Участники конкретного челленджа
      const { data: participants, error } = await supabaseClient
        .from('challenge_participants')
        .select(`
          user_id,
          profiles!challenge_participants_user_id_fkey (
            username,
            full_name
          )
        `)
        .eq('challenge_id', broadcast.challenge_id);

      if (!error && participants) {
        recipients = participants.map((cp: any) => ({
          user_id: cp.user_id,
          username: cp.profiles.username,
          email: `${cp.profiles.username}@example.com`
        }));
      }
    }

    console.log(`Найдено получателей: ${recipients.length}`);

    // Здесь должна быть логика отправки email
    // Для демонстрации просто логируем
    let sentCount = 0;
    
    for (const recipient of recipients) {
      try {
        // Здесь должен быть вызов API отправки email (например, Resend)
        console.log(`Отправка письма получателю: ${recipient.email}`);
        console.log(`Тема: ${broadcast.subject}`);
        console.log(`Сообщение: ${broadcast.message}`);
        
        sentCount++;
      } catch (emailError) {
        console.error(`Ошибка отправки email ${recipient.email}:`, emailError);
      }
    }

    // Обновляем счетчик отправленных писем
    await supabaseClient
      .from('trainer_broadcasts')
      .update({ sent_count: sentCount })
      .eq('id', broadcastId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: sentCount,
        message: `Рассылка отправлена ${sentCount} получателям`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-trainer-broadcast function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);