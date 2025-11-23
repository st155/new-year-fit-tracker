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
    const systemPrompt = `You are an expert at creating clear, descriptive file names for medical documents.
    
Your task:
1. Analyze the file name and document type
2. Generate a smart, descriptive name in Russian
3. Format: {Тип} - {Ключевая информация} - {Дата}.{расширение}

Rules:
- Use Russian language
- Include document type (e.g., "Анализ крови", "InBody", "Фото прогресса")
- Extract date if present in filename
- Keep file extension
- Maximum 100 characters
- Clear and searchable

Examples:
- scan_123.pdf → Анализ крови - Биохимия - 15 нояб 2024.pdf
- IMG_4567.jpg → Фото прогресса - Передняя проекция - 20 нояб 2024.jpg
- inbody_report.pdf → InBody - Состав тела - 10 нояб 2024.pdf`;

    const userPrompt = `Original filename: ${fileName}
Document type: ${documentType}
${fileContent ? `Content preview: ${fileContent.substring(0, 500)}` : ''}

Generate a smart filename.`;

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
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI_RENAME] AI API error:', aiResponse.status, errorText);
      
      // Fallback: simple rename based on document type
      const extension = fileName.split('.').pop();
      const date = new Date().toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      const typeMap: Record<string, string> = {
        'blood_test': 'Анализ крови',
        'inbody': 'InBody',
        'progress_photo': 'Фото прогресса',
        'fitness_report': 'Мед. заключение',
        'vo2max': 'VO2max',
        'caliper': 'Калипер',
        'prescription': 'Рецепт',
        'training_program': 'Программа',
        'other': 'Документ'
      };
      const suggestedName = `${typeMap[documentType] || 'Документ'} - ${date}.${extension}`;
      
      return new Response(
        JSON.stringify({ suggestedName }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const suggestedName = aiData.choices?.[0]?.message?.content?.trim() || fileName;

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
