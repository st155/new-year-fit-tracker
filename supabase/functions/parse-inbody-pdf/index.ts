import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body with PDF URL
    const { pdfUrl } = await req.json();
    
    if (!pdfUrl) {
      throw new Error('PDF URL is required');
    }

    console.log('Fetching PDF from:', pdfUrl);

    // Download PDF from storage
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = btoa(
      new Uint8Array(pdfBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    console.log('Calling AI to parse InBody PDF...');

    // Call AI to parse the PDF
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp',
        messages: [
          {
            role: 'system',
            content: `Ты эксперт по парсингу InBody анализов. Извлеки все данные из PDF и верни их в JSON формате.
            
Важные поля для извлечения:
- test_date: дата и время теста (формат: YYYY-MM-DDTHH:MM:SS)
- weight: вес в кг
- skeletal_muscle_mass: мышечная масса в кг (SMM)
- percent_body_fat: процент жира (PBF %)
- body_fat_mass: масса жира в кг
- visceral_fat_area: висцеральный жир в см²
- bmi: индекс массы тела (Body Mass Index)
- bmr: базальный метаболизм в ккал (Basal Metabolic Rate)
- total_body_water: общая вода в литрах
- protein: белок в кг
- minerals: минералы в кг

Верни ТОЛЬКО валидный JSON без дополнительного текста.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Распарси этот InBody PDF и извлеки все метрики:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI parsing failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const parsedText = aiData.choices?.[0]?.message?.content;
    
    if (!parsedText) {
      throw new Error('Не удалось распознать данные');
    }

    console.log('AI response:', parsedText);

    // Extract JSON from response
    const jsonMatch = parsedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Некорректный формат ответа от AI');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    console.log('Parsed data:', parsedData);

    return new Response(
      JSON.stringify(parsedData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('parse-inbody-pdf error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});