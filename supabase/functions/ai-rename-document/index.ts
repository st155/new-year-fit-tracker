import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, documentType, fileContent } = await req.json();
    
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[AI_RENAME] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AI_RENAME] Processing file:', fileName, '| type:', documentType);

    // Create system prompt for intelligent file renaming
    const systemPrompt = `Generate a SHORT English filename.

Format: {Type}_{MonthYear}.{extension}

Type mappings:
- Blood test, Urine, Biochemistry, Hemogram, CBC, Анализ крови, Анализ мочи → Lab
- MRI, МРТ, Magnetic Resonance → MRI  
- CT, КТ, Computed Tomography → CT
- Ultrasound, USG, УЗИ, Ультразвук → USG
- InBody, Body composition, Состав тела → InBody
- VO2max, Cardio test, Кардио тест → VO2
- Progress photo, Фото прогресса → Photo
- Prescription, Recipe, Рецепт → Rx
- Training program, Программа → Program
- Other → Doc

Extract the TEST DATE from document content (the sample collection date, NOT the filename date).
Month: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
Year: Last 2 digits (25, 24, 23)

Examples:
- Blood test taken Nov 25, 2025 → Lab_Nov25.pdf
- MRI from October 2024 → MRI_Oct24.pdf
- Urine analysis December 2024 → Lab_Dec24.pdf
- InBody scan November 2024 → InBody_Nov24.pdf

CRITICAL: Output ONLY the filename, nothing else. No markdown, no explanations.`;

    const userPrompt = `Original filename: ${fileName}
Document type: ${documentType}
${fileContent ? `Content preview (first 2000 chars): ${fileContent.substring(0, 2000)}` : ''}

Generate SHORT English filename.`;

    // Call Lovable AI Gateway
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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 100,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI_RENAME] AI API error:', aiResponse.status, errorText);
      
      // Fallback: simple rename based on document type
      const extension = fileName.split('.').pop();
      const date = new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        year: '2-digit' 
      }).replace(' ', '');
      
      const typeMap: Record<string, string> = {
        'blood_test': 'Lab',
        'inbody': 'InBody',
        'progress_photo': 'Photo',
        'fitness_report': 'Doc',
        'vo2max': 'VO2',
        'caliper': 'Doc',
        'prescription': 'Rx',
        'training_program': 'Program',
        'other': 'Doc'
      };
      const suggestedName = `${typeMap[documentType] || 'Doc'}_${date}.${extension}`;
      
      return new Response(
        JSON.stringify({ suggestedName }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    let suggestedName = aiData.choices?.[0]?.message?.content?.trim() || fileName;
    
    // Clean up the suggested name (remove markdown, quotes, etc.)
    suggestedName = suggestedName
      .replace(/```[a-z]*\n?/gi, '')
      .replace(/`/g, '')
      .replace(/['"]/g, '')
      .trim();

    console.log('[AI_RENAME] Success:', fileName, '→', suggestedName);

    return new Response(
      JSON.stringify({ suggestedName }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[AI_RENAME] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
