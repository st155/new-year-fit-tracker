import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

    // Get request body: images from client
    const { images, uploadId } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('Images are required');
    }

    console.log(`Processing ${images.length} image(s)...`);

    console.log('Calling AI to parse InBody images...');

    // Build content with all images
    const imageContents = images.map((img: string) => ({
      type: 'image_url',
      image_url: { url: img }
    }));

    // Call AI to parse the images
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
            content: `Ты эксперт по парсингу InBody анализов. Извлеки все данные из изображений и верни их в JSON формате.
            
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
                text: 'Распарси эти InBody изображения и извлеки все метрики:'
              },
              ...imageContents
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

    const metrics = JSON.parse(jsonMatch[0]);
    const warnings: string[] = [];

    // Helpers
    const normalizeNumber = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      const str = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
      const num = parseFloat(str);
      return isNaN(num) ? null : Math.round(num * 10) / 10;
    };

    const normalizeInteger = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      const str = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
      const num = parseInt(str);
      return isNaN(num) ? null : num;
    };

    // Parse date
    let testDate: string;
    if (metrics.test_date) {
      try {
        const parsed = new Date(metrics.test_date);
        if (isNaN(parsed.getTime())) {
          warnings.push('Invalid test_date format, using current time');
          testDate = new Date().toISOString();
        } else {
          testDate = parsed.toISOString();
        }
      } catch {
        warnings.push('Failed to parse test_date, using current time');
        testDate = new Date().toISOString();
      }
    } else {
      warnings.push('No test_date provided, using current time');
      testDate = new Date().toISOString();
    }

    const normalizedData: any = {
      user_id: user.id,
      test_date: testDate,
      weight: normalizeNumber(metrics.weight),
      skeletal_muscle_mass: normalizeNumber(metrics.skeletal_muscle_mass),
      percent_body_fat: normalizeNumber(metrics.percent_body_fat),
      body_fat_mass: normalizeNumber(metrics.body_fat_mass),
      visceral_fat_area: normalizeNumber(metrics.visceral_fat_area),
      bmi: normalizeNumber(metrics.bmi),
      bmr: normalizeInteger(metrics.bmr),
      total_body_water: normalizeNumber(metrics.total_body_water),
      protein: normalizeNumber(metrics.protein),
      minerals: normalizeNumber(metrics.minerals),
      right_arm_mass: normalizeNumber(metrics.right_arm_mass),
      right_arm_percent: normalizeNumber(metrics.right_arm_percent),
      left_arm_mass: normalizeNumber(metrics.left_arm_mass),
      left_arm_percent: normalizeNumber(metrics.left_arm_percent),
      trunk_mass: normalizeNumber(metrics.trunk_mass),
      trunk_percent: normalizeNumber(metrics.trunk_percent),
      right_leg_mass: normalizeNumber(metrics.right_leg_mass),
      right_leg_percent: normalizeNumber(metrics.right_leg_percent),
      left_leg_mass: normalizeNumber(metrics.left_leg_mass),
      left_leg_percent: normalizeNumber(metrics.left_leg_percent),
      raw_data: metrics
    };

    console.log('Saving analysis to DB...');
    const { data: analysis, error: insertError } = await supabase
      .from('inbody_analyses')
      .insert(normalizedData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save analysis: ${insertError.message}`);
    }

    // Update upload status if provided
    if (uploadId) {
      console.log('Updating upload status for:', uploadId);
      const { error: updateError } = await supabase
        .from('inbody_uploads')
        .update({ status: 'analyzed', analysis_id: analysis.id })
        .eq('id', uploadId);
      if (updateError) {
        console.error('Failed to update upload status:', updateError);
        warnings.push('Failed to update upload status');
      }
    }

    return new Response(
      JSON.stringify({ analysis, warnings, model_used: 'google/gemini-2.0-flash-exp' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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