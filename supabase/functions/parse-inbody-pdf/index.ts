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

    // Get Lovable API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build content with all images
    const imageContents = images.map((img: string) => ({
      type: 'image_url',
      image_url: { url: img }
    }));

    // Call AI to parse the images - MULTI-REPORT support
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Ты эксперт по анализу InBody сканирований. Извлеки все данные из изображений.

ВАЖНО: PDF может содержать НЕСКОЛЬКО InBody отчётов с РАЗНЫМИ датами тестов!
- Определи все уникальные даты тестов (test_date) на изображениях
- Каждая уникальная дата = отдельный отчёт
- Если 2+ разных дат → верни массив "reports" с несколькими объектами

Извлеки для КАЖДОГО отчёта следующие поля:
- test_date: дата и время теста (формат: YYYY-MM-DDTHH:MM:SS). ВАЖНО: InBody использует ЕВРОПЕЙСКИЙ формат DD.MM.YYYY (день.месяц.год). Например: "02.12.2025" = 2 декабря 2025 года (НЕ 12 февраля!)
- weight: вес в кг
- skeletal_muscle_mass: мышечная масса в кг (SMM)
- percent_body_fat: процент жира (PBF %)
- body_fat_mass: масса жира в кг
- visceral_fat_area: висцеральный жир в см²
- bmi: индекс массы тела
- bmr: базальный метаболизм в ккал
- total_body_water: общая вода в литрах
- protein: белок в кг
- minerals: минералы в кг
- right_arm_mass, right_arm_percent, left_arm_mass, left_arm_percent
- trunk_mass, trunk_percent
- right_leg_mass, right_leg_percent, left_leg_mass, left_leg_percent

Также для каждого отчёта создай:
- "summary" - краткий текстовый анализ (3-5 предложений)
- "key_insights" - массив из 3 ключевых инсайтов

ФОРМАТ ОТВЕТА:
{
  "reports": [
    {
      "metrics": { ... все метрики первого теста ... },
      "summary": "текстовый summary первого теста",
      "key_insights": ["Инсайт 1", "Инсайт 2", "Инсайт 3"]
    },
    {
      "metrics": { ... все метрики второго теста (если есть) ... },
      "summary": "текстовый summary второго теста",
      "key_insights": ["Инсайт 1", "Инсайт 2", "Инсайт 3"]
    }
  ]
}

Если только один тест — всё равно верни массив с одним объектом.
Верни ТОЛЬКО валидный JSON без дополнительного текста.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Проанализируй InBody сканирование(я), извлеки все метрики из КАЖДОГО уникального теста (разные даты = разные тесты):'
              },
              ...imageContents
            ]
          }
        ],
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

    const aiResult = JSON.parse(jsonMatch[0]);
    
    // Поддержка multi-report и старого формата
    let reports: any[];
    if (aiResult.reports && Array.isArray(aiResult.reports)) {
      reports = aiResult.reports;
      console.log(`Multi-report PDF detected: ${reports.length} reports found`);
    } else {
      // Старый формат - один отчёт
      reports = [{
        metrics: aiResult.metrics || aiResult,
        summary: aiResult.summary || null,
        key_insights: aiResult.key_insights || []
      }];
      console.log('Single report format detected');
    }

    const warnings: string[] = [];
    const createdAnalyses: any[] = [];

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

    // Process each report
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      const metrics = report.metrics || report;
      const summary = report.summary || null;
      const keyInsights = report.key_insights || [];

      console.log(`Processing report ${i + 1}/${reports.length}, test_date: ${metrics.test_date}`);

      // Parse date
      let testDate: string;
      if (metrics.test_date) {
        try {
          const parsed = new Date(metrics.test_date);
          if (isNaN(parsed.getTime())) {
            warnings.push(`Report ${i + 1}: Invalid test_date format, using current time`);
            testDate = new Date().toISOString();
          } else {
            testDate = parsed.toISOString();
          }
        } catch {
          warnings.push(`Report ${i + 1}: Failed to parse test_date, using current time`);
          testDate = new Date().toISOString();
        }
      } else {
        warnings.push(`Report ${i + 1}: No test_date provided, using current time`);
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
        ai_summary: summary,
        ai_insights: keyInsights,
        raw_data: metrics
      };

      console.log(`Saving report ${i + 1} to DB (test_date: ${testDate})...`);
      const { data: analysis, error: insertError } = await supabase
        .from('inbody_analyses')
        .insert(normalizedData)
        .select()
        .single();

      if (insertError) {
        console.error(`Database insert error for report ${i + 1}:`, insertError);
        warnings.push(`Failed to save report ${i + 1}: ${insertError.message}`);
        continue;
      }

      createdAnalyses.push({
        ...analysis,
        summary,
        key_insights: keyInsights
      });
    }

    if (createdAnalyses.length === 0) {
      throw new Error('Failed to save any reports');
    }

    console.log(`Successfully created ${createdAnalyses.length} analysis records`);

    // Update upload status with first analysis_id
    if (uploadId) {
      console.log('Updating upload status for:', uploadId);
      const { error: updateError } = await supabase
        .from('inbody_uploads')
        .update({ status: 'analyzed', analysis_id: createdAnalyses[0].id })
        .eq('id', uploadId);
      if (updateError) {
        console.error('Failed to update upload status:', updateError);
        warnings.push('Failed to update upload status');
      }
    }

    return new Response(
      JSON.stringify({ 
        analyses: createdAnalyses,
        // Обратная совместимость: также возвращаем первый анализ как analysis
        analysis: createdAnalyses[0],
        summary: createdAnalyses[0]?.summary,
        key_insights: createdAnalyses[0]?.key_insights,
        reports_count: createdAnalyses.length,
        warnings, 
        model_used: 'google/gemini-2.5-flash' 
      }),
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
