import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { createAIClient, AIProvider } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      conversation_id,
      message,
      conversation_type = 'general',
      mentioned_clients = [],
      attachments = [],
      client_user_id,
      auto_execute = false
    } = await req.json();

    console.log('📨 AI Chat request:', { conversation_id, message_preview: message?.substring(0, 50) });

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id,
        role: 'user',
        content: message
      })
      .select()
      .single();

    if (userMsgError) throw userMsgError;

    // Get conversation context
    const { data: messages } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    // Get client context if specified
    let clientContext = '';
    if (client_user_id) {
      const { data: clientData } = await supabase
        .from('client_assignments')
        .select(`
          *,
          client_user:user_id (
            id,
            email,
            profiles (display_name, avatar_url)
          )
        `)
        .eq('user_id', client_user_id)
        .eq('trainer_id', user.id)
        .single();

      if (clientData) {
        clientContext = `\n\nКлиент: ${clientData.client_user?.profiles?.display_name || clientData.client_user?.email}`;
      }
    }

    // Build AI prompt
    const systemPrompt = `Ты AI-ассистент для фитнес-тренера. Помогай тренеру управлять клиентами, целями, тренировочными планами и метриками.

Доступные действия:
- create_goal: Создать цель для клиента
- update_goal: Обновить существующую цель
- delete_goal: Удалить цель
- add_measurement: Добавить измерение (вес, обхваты и т.д.)
- create_task: Создать задачу для клиента
- create_training_plan: Создать тренировочный план
- assign_training_plan: Назначить план клиенту

Когда тренер просит выполнить действие, предложи конкретный план с параметрами.${clientContext}

Отвечай на русском языке, будь конкретным и полезным.`;

    const conversationMessages = (messages || []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    // Call AI
    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiResponse = await aiClient.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationMessages
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    console.log('🤖 AI response received');

    // Save assistant message
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id,
        role: 'assistant',
        content: aiResponse.content
      })
      .select()
      .single();

    if (assistantMsgError) throw assistantMsgError;

    // Update conversation timestamp
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    // Check if AI suggested actions (simple detection)
    const suggestsAction = aiResponse.content.toLowerCase().includes('создать') ||
                          aiResponse.content.toLowerCase().includes('добавить') ||
                          aiResponse.content.toLowerCase().includes('назначить');

    let pendingActionId = null;

    if (suggestsAction && !auto_execute) {
      // Create pending action for manual approval
      const { data: pendingAction } = await supabase
        .from('ai_pending_actions')
        .insert({
          trainer_id: user.id,
          conversation_id,
          action_type: 'general',
          action_plan: aiResponse.content,
          action_data: { message: message, response: aiResponse.content },
          status: 'pending'
        })
        .select()
        .single();

      pendingActionId = pendingAction?.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: assistantMessage.id,
        assistant_message: aiResponse.content,
        pending_action_id: pendingActionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ AI chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
