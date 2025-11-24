import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Ты эксперт по анализу протоколов добавок. Извлеки все добавки из текста протокола.

Для каждой добавки определи:
- supplement_name: полное название добавки (на русском или английском)
- dosage_amount: числовое значение дозировки
- dosage_unit: единица измерения (мг, г, мкг, шт, капсула, таблетка)
- intake_times: массив времени приема (только из этих значений: "morning", "afternoon", "evening", "before_sleep")
- timing_notes: особые инструкции (до еды, после еды, за 30 минут до сна, натощак)
- form: форма выпуска (капсула, таблетка, жидкость, порошок, масло)
- brand: бренд если указан (например NOW Foods, Solgar)

ВАЖНО - Преобразуй естественные выражения времени:
- "Утро" или "утром" → "morning"
- "Обед" или "днем" → "afternoon"  
- "Ужин" или "вечером" → "evening"
- "Перед сном" или "на ночь" → "before_sleep"

Если добавка упоминается в нескольких приемах пищи (утро, обед, ужин), включи ВСЕ времена в intake_times.

Примеры:
- "Витамин D 5000 МЕ утром" → {"supplement_name": "Витамин D", "dosage_amount": 5000, "dosage_unit": "МЕ", "intake_times": ["morning"], "timing_notes": "", "form": "капсула"}
- "Магний 200 мг 3 раза в день после еды" → {"supplement_name": "Магний", "dosage_amount": 200, "dosage_unit": "мг", "intake_times": ["morning", "afternoon", "evening"], "timing_notes": "после еды", "form": "таблетка"}
- "Мелатонин 3 мг за 30 минут до сна" → {"supplement_name": "Мелатонин", "dosage_amount": 3, "dosage_unit": "мг", "intake_times": ["before_sleep"], "timing_notes": "за 30 минут до сна", "form": "таблетка"}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_supplements',
            description: 'Extract all supplements with their dosages and intake times from protocol text',
            parameters: {
              type: 'object',
              properties: {
                supplements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      supplement_name: { type: 'string' },
                      dosage_amount: { type: 'number' },
                      dosage_unit: { type: 'string' },
                      intake_times: { 
                        type: 'array',
                        items: { 
                          type: 'string',
                          enum: ['morning', 'afternoon', 'evening', 'before_sleep']
                        }
                      },
                      timing_notes: { type: 'string' },
                      form: { type: 'string' },
                      brand: { type: 'string' }
                    },
                    required: ['supplement_name', 'dosage_amount', 'dosage_unit', 'intake_times']
                  }
                }
              },
              required: ['supplements']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_supplements' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function?.name !== 'extract_supplements') {
      return new Response(
        JSON.stringify({ error: 'Failed to extract supplements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        success: true,
        supplements: result.supplements 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse protocol error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});