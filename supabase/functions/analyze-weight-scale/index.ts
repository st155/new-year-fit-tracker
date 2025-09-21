import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weight scale analysis...');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      throw new Error('No image file provided');
    }

    console.log('Image file received:', imageFile.name, imageFile.size);

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = imageFile.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('Sending request to OpenAI Vision API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ты эксперт по анализу изображений весов. Твоя задача - определить показания весов на фотографии.

ВАЖНЫЕ ПРАВИЛА:
1. Ищи ТОЛЬКО цифровые показания на дисплее весов
2. Возвращай ТОЛЬКО число в килограммах (например: 70.5)
3. Если видишь весы но не можешь четко прочитать цифры - верни "unclear"
4. Если на фото нет весов - верни "no_scale"
5. НЕ ДОДУМЫВАЙ и НЕ УГАДЫВАЙ числа - только то, что четко видно

Примеры ответов:
- "75.2" (если четко видно 75.2 кг)
- "68" (если четко видно 68 кг) 
- "unclear" (если весы есть, но цифры нечеткие)
- "no_scale" (если весов нет на фото)`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Определи показания весов на этом фото. Верни только число в килограммах или "unclear"/"no_scale".'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    const analysis = data.choices[0].message.content.trim().toLowerCase();
    console.log('Analysis result:', analysis);

    if (analysis === 'no_scale') {
      return new Response(JSON.stringify({
        success: false,
        message: 'На фото не найдены весы. Попробуйте сделать фото дисплея весов.',
        weight: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (analysis === 'unclear') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Показания весов неразборчивы. Попробуйте сделать более четкое фото дисплея.',
        weight: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to parse weight value
    const weightMatch = analysis.match(/(\d+(?:\.\d+)?)/);
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      
      // Sanity check for reasonable weight values (20-300 kg)
      if (weight >= 20 && weight <= 300) {
        console.log('Successfully extracted weight:', weight);
        return new Response(JSON.stringify({
          success: true,
          weight: weight,
          message: `Определен вес: ${weight} кг`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log('Weight out of reasonable range:', weight);
        return new Response(JSON.stringify({
          success: false,
          message: 'Определенное значение выглядит неправдоподобно. Проверьте фото.',
          weight: null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If we can't parse a number
    return new Response(JSON.stringify({
      success: false,
      message: 'Не удалось определить числовое значение веса. Попробуйте другое фото.',
      weight: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-weight-scale function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      message: 'Произошла ошибка при анализе изображения'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});