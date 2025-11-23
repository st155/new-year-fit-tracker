import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName } = await req.json();
    
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[ai-classify-document] Classifying:', fileName);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Ты эксперт по классификации медицинских документов. Определи тип документа и теги на основе названия файла.

Доступные типы:
- inbody: InBody анализы состава тела
- blood_test: Анализы крови
- medical_report: Медицинские заключения, консультации врачей
- progress_photo: Фотографии прогресса
- other: Любой другой тип

Правила:
- Если файл содержит "InBody", "inbody", "состав тела" → type: inbody
- Если содержит "анализ крови", "кровь", "blood test", "Synevo", "Invitro" → type: blood_test
- Если содержит "фото", "photo", "прогресс", "progress" → type: progress_photo
- Если содержит "заключение", "консультация", "report" → type: medical_report
- В остальных случаях → type: other

Извлеки дату из названия если есть (форматы: DD.MM.YYYY, YYYY-MM-DD, "январь 2024", "ноябрь" и т.д.)
Сгенерируй 2-4 релевантных тега на русском (например: ["анализ крови", "холестерин"], ["InBody", "композиция тела"])

ВАЖНО: Отвечай ТОЛЬКО используя tool call, не отправляй текстовые сообщения.`
          },
          {
            role: 'user',
            content: `Классифицируй файл: "${fileName}"`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_document',
              description: 'Классифицирует медицинский документ по названию файла',
              parameters: {
                type: 'object',
                properties: {
                  document_type: {
                    type: 'string',
                    enum: ['inbody', 'blood_test', 'medical_report', 'progress_photo', 'other'],
                    description: 'Тип документа'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Список тегов на русском языке (2-4 тега)'
                  },
                  suggested_date: {
                    type: 'string',
                    description: 'Дата в формате YYYY-MM-DD если найдена в названии, иначе null',
                    nullable: true
                  },
                  confidence: {
                    type: 'number',
                    description: 'Уверенность в классификации (0-1)',
                    minimum: 0,
                    maximum: 1
                  }
                },
                required: ['document_type', 'tags', 'suggested_date', 'confidence'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_document' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-classify-document] API error:', response.status, errorText);
      
      // Fallback на базовую классификацию
      return new Response(
        JSON.stringify({
          document_type: 'other',
          tags: [],
          suggested_date: null,
          confidence: 0.1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('[ai-classify-document] Raw response:', JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('[ai-classify-document] No tool call in response');
      return new Response(
        JSON.stringify({
          document_type: 'other',
          tags: [],
          suggested_date: null,
          confidence: 0.1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const classification = JSON.parse(toolCall.function.arguments);
    console.log('[ai-classify-document] Classification:', classification);

    return new Response(
      JSON.stringify(classification),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-classify-document] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        document_type: 'other',
        tags: [],
        suggested_date: null,
        confidence: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
