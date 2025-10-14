import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { pdfStoragePath } = await req.json();
    
    if (!pdfStoragePath) {
      throw new Error('pdfStoragePath is required');
    }

    console.log('Creating signed URL for:', pdfStoragePath);
    
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('inbody-pdfs')
      .createSignedUrl(pdfStoragePath, 900);

    if (signedError || !signedUrlData?.signedUrl) {
      console.error('Failed to create signed URL:', signedError);
      throw new Error('Failed to create signed URL for PDF');
    }

    const warnings: string[] = [];
    let modelUsed = 'google/gemini-2.5-flash';

    let aiData: any = null;

    // Helper: build AI request body
    const buildAiBody = (contentPart: any) => ({
      model: modelUsed,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting body composition data from InBody analysis PDFs. Extract all available metrics with high precision. The PDF may be in Russian or English. Convert all values to standard units: weight in kg, percentages as numbers (15.5 not "15.5%"), masses in kg, area in cm², BMI as number, BMR as integer calories. For dates, use ISO format (YYYY-MM-DDTHH:mm:ss). If a field is not found, omit it from the response.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all InBody metrics from this PDF. Use the inbody_metrics tool to return structured data.' },
            contentPart
          ]
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'inbody_metrics',
            description: 'Extract InBody body composition metrics from the analysis PDF',
            parameters: {
              type: 'object',
              properties: {
                test_date: { type: 'string', description: 'Test date in ISO format (YYYY-MM-DDTHH:mm:ss)' },
                weight: { type: 'number', description: 'Body weight in kg' },
                skeletal_muscle_mass: { type: 'number', description: 'Skeletal muscle mass in kg' },
                percent_body_fat: { type: 'number', description: 'Body fat percentage as number (e.g., 15.5)' },
                body_fat_mass: { type: 'number', description: 'Body fat mass in kg' },
                visceral_fat_area: { type: 'number', description: 'Visceral fat area in cm²' },
                bmi: { type: 'number', description: 'Body Mass Index' },
                bmr: { type: 'integer', description: 'Basal Metabolic Rate in kcal' },
                total_body_water: { type: 'number', description: 'Total body water in L' },
                protein: { type: 'number', description: 'Protein mass in kg' },
                minerals: { type: 'number', description: 'Mineral mass in kg' },
                right_arm_mass: { type: 'number', description: 'Right arm muscle mass in kg' },
                right_arm_percent: { type: 'number', description: 'Right arm muscle percentage' },
                left_arm_mass: { type: 'number', description: 'Left arm muscle mass in kg' },
                left_arm_percent: { type: 'number', description: 'Left arm muscle percentage' },
                trunk_mass: { type: 'number', description: 'Trunk muscle mass in kg' },
                trunk_percent: { type: 'number', description: 'Trunk muscle percentage' },
                right_leg_mass: { type: 'number', description: 'Right leg muscle mass in kg' },
                right_leg_percent: { type: 'number', description: 'Right leg muscle percentage' },
                left_leg_mass: { type: 'number', description: 'Left leg muscle mass in kg' },
                left_leg_percent: { type: 'number', description: 'Left leg muscle percentage' }
              },
              required: ['test_date']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'inbody_metrics' } }
    });

    // Attempt 1: signed URL (fast path)
    console.log('Calling Lovable AI with signed URL...');
    let aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildAiBody({
        type: 'image_url',
        image_url: { url: signedUrlData.signedUrl }
      }))
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error('AI API error (signed URL):', status, errorText);

      // Handle rate/credits
      if (status === 429) throw new Error('AI rate limit exceeded. Please try again in a minute.');
      if (status === 402) throw new Error('AI credits exhausted. Please add credits to your Lovable workspace.');

      // For large files that fail image extraction, skip base64 fallback
      if (status === 400 && errorText.includes('Failed to extract')) {
        throw new Error('Не удалось извлечь данные из PDF. Файл слишком сложный. Попробуйте:\n1. Пересканировать InBody в более низком качестве\n2. Конвертировать PDF в изображения и загрузить отдельно\n3. Использовать другой формат экспорта InBody');
      }

      throw new Error(`AI processing failed (${status}). Please try again or contact support.`);
    }

    aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('AI did not return structured data. Please try again or use a different PDF.');
    }

    let metrics = JSON.parse(toolCall.function.arguments);
    console.log('Extracted metrics:', metrics);

    // Normalize values
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

    // Build normalized data
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
      raw_data: metrics,
      pdf_url: signedUrlData.signedUrl.split('?')[0] // URL without signature
    };

    // Check critical fields
    if (!normalizedData.weight && !normalizedData.percent_body_fat) {
      warnings.push('Missing critical fields (weight and body fat %), consider manual review');
    }

    console.log('Inserting into database...');
    const { data: analysis, error: insertError } = await supabase
      .from('inbody_analyses')
      .insert(normalizedData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save analysis: ${insertError.message}`);
    }

    console.log('InBody analysis saved successfully:', analysis.id);

    return new Response(
      JSON.stringify({ 
        analysis,
        warnings,
        model_used: modelUsed 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in inbody-ingest:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
