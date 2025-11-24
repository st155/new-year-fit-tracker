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
- supplement_name: МЕЖДУНАРОДНОЕ название на английском языке (стандартизированное)
- dosage_amount: числовое значение дозировки
- dosage_unit: единица измерения на английском (mg, g, mcg, IU, capsule, tablet)
- intake_times: массив времени приема (только из этих значений: "morning", "afternoon", "evening", "before_sleep")
- timing_notes: особые инструкции на английском (before meal, after meal, 30 min before sleep, on empty stomach)
- form: форма выпуска на английском (capsule, tablet, liquid, powder, oil, softgel)
- brand: бренд если указан (например NOW Foods, Solgar, Life Extension)

КРИТИЧЕСКИ ВАЖНО - Конвертация русских названий в международные английские:
- "Витамин D" / "Витамин Д" → "Vitamin D"
- "Магний цитрат" / "Магний" → "Magnesium Citrate"
- "Омега-3" / "Омега 3" → "Omega-3"
- "Убихинол" → "Ubiquinol"
- "Коэнзим Q10" → "Coenzyme Q10"
- "Мелатонин" → "Melatonin"
- "Ашваганда" / "Ashwagandha" → "Ashwagandha"
- "Родиола розовая" → "Rhodiola Rosea"
- "Трутневое молочко" → "Royal Jelly"
- "Аскорбат натрия" → "Sodium Ascorbate"
- "5-HTP" / "5 НТР" → "5-HTP"
- "Теанин" → "L-Theanine"
- "Чесночное масло" / "Garlic Oil" → "Garlic Oil"
- "Витамин C" / "Витамин С" → "Vitamin C"
- "Цинк" → "Zinc"
- "Селен" → "Selenium"
- "Железо" → "Iron"
- "Кальций" → "Calcium"
- "Витамин B" → "Vitamin B"

Преобразуй единицы измерения:
- "мг" → "mg"
- "г" → "g"
- "мкг" → "mcg"
- "МЕ" → "IU"
- "шт" / "капсула" → "capsule"
- "таблетка" → "tablet"

Преобразуй время приема:
- "Утро" / "утром" → "morning"
- "Обед" / "днем" → "afternoon"  
- "Ужин" / "вечером" → "evening"
- "Перед сном" / "на ночь" → "before_sleep"

Преобразуй инструкции:
- "до еды" → "before meal"
- "после еды" → "after meal"
- "за 30 минут до сна" → "30 min before sleep"
- "натощак" → "on empty stomach"

Если добавка упоминается в нескольких приемах пищи (утро, обед, ужин), включи ВСЕ времена в intake_times.

Примеры правильной конвертации:
- "Витамин D 5000 МЕ утром" → {"supplement_name": "Vitamin D", "dosage_amount": 5000, "dosage_unit": "IU", "intake_times": ["morning"], "timing_notes": "", "form": "capsule"}
- "Магний 200 мг 3 раза в день после еды" → {"supplement_name": "Magnesium Citrate", "dosage_amount": 200, "dosage_unit": "mg", "intake_times": ["morning", "afternoon", "evening"], "timing_notes": "after meal", "form": "tablet"}
- "Мелатонин 3 мг за 30 минут до сна" → {"supplement_name": "Melatonin", "dosage_amount": 3, "dosage_unit": "mg", "intake_times": ["before_sleep"], "timing_notes": "30 min before sleep", "form": "tablet"}
- "Трутневое молочко - до еды" → {"supplement_name": "Royal Jelly", "timing_notes": "before meal", "form": "liquid"}
- "5 НТР - 200 мг перед сном" → {"supplement_name": "5-HTP", "dosage_amount": 200, "dosage_unit": "mg", "intake_times": ["before_sleep"], "form": "capsule"}`;

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