import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { pdfStoragePath, uploadId } = await req.json();
    
    if (!pdfStoragePath) {
      throw new Error('pdfStoragePath is required');
    }

    console.log('Downloading PDF from storage:', pdfStoragePath);
    
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('inbody-pdfs')
      .download(pdfStoragePath);

    if (downloadError || !pdfData) {
      console.error('Failed to download PDF:', downloadError);
      throw new Error('Failed to download PDF from storage');
    }

    console.log('Analyzing PDF with AI...');
    
    // Get signed URL for the PDF instead of loading it into memory
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('inbody-pdfs')
      .createSignedUrl(pdfStoragePath, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      console.error('Failed to create signed URL:', signedUrlError);
      throw new Error('Failed to create signed URL for PDF');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert at extracting data from InBody body composition analysis PDFs.
Extract the following metrics from the PDF and return them as a JSON object:

{
  "test_date": "YYYY-MM-DD format",
  "weight": "number in kg",
  "skeletal_muscle_mass": "number in kg",
  "percent_body_fat": "number as percentage",
  "body_fat_mass": "number in kg",
  "visceral_fat_area": "number in cm²",
  "bmi": "number",
  "bmr": "number in kcal",
  "total_body_water": "number in liters",
  "protein": "number in kg",
  "minerals": "number in kg",
  "right_arm_mass": "number in kg",
  "right_arm_percent": "number as percentage",
  "left_arm_mass": "number in kg",
  "left_arm_percent": "number as percentage",
  "trunk_mass": "number in kg",
  "trunk_percent": "number as percentage",
  "right_leg_mass": "number in kg",
  "right_leg_percent": "number as percentage",
  "left_leg_mass": "number in kg",
  "left_leg_percent": "number as percentage"
}

Return ONLY the JSON object, no additional text. If a value is not found, use null.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please extract the InBody metrics from this PDF.' },
              {
                type: 'image_url',
                image_url: { url: signedUrlData.signedUrl }
              }
            ]
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', aiContent);

    // Parse JSON from AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from AI response');
    }

    const metrics = JSON.parse(jsonMatch[0]);
    const warnings: string[] = [];
    const modelUsed = 'google/gemini-2.5-flash';

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

    // Update inbody_uploads if uploadId provided
    if (uploadId) {
      console.log('Updating upload status for:', uploadId);
      const { error: updateError } = await supabase
        .from('inbody_uploads')
        .update({ 
          status: 'analyzed',
          analysis_id: analysis.id
        })
        .eq('id', uploadId);
      
      if (updateError) {
        console.error('Failed to update upload status:', updateError);
        warnings.push('Failed to update upload status');
      }
    }

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
