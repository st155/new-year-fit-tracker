import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileContent, mimeType } = await req.json();
    
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[ai-classify-document] Classifying:', fileName, fileContent ? 'WITH content' : 'filename only');

    // Prepare user message with optional file content
    const userMessage: any = {
      role: 'user',
      content: fileContent && mimeType === 'application/pdf' ? [
        {
          type: 'text',
          text: `Analyze this medical document PDF and classify it.

CRITICAL: Extract the TEST DATE from the document content itself!
Look for: "Date du prélèvement", "Дата забора", "Test Date", "Collection Date", "Sample Date", "Date de l'examen"

Filename for reference: "${fileName}"`
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${fileContent}`
          }
        }
      ] : `Classify file: "${fileName}"`
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a medical document classifier. Analyze document CONTENT (not just filename) to determine type.

Categories:
- blood_test: Lab reports with CBC, lipids, hormones, biochemistry panels (Look for: "Résultats de laboratoire", "Hématologie", "Биохимия", "Blood Test", "Hemogram", "Анализ крови")
- lab_urine: Urinalysis, urine test results (Look for: "Анализ мочи", "Urinalysis", "ОАМ", "Urine")
- inbody: Body composition analysis (Look for: "InBody", "Состав тела", "Body Composition")
- imaging_report: MRI, CT, ultrasound, X-ray (Look for: "МРТ", "MRI", "УЗИ", "Ultrasound", "CT", "КТ", "Рентген", "X-ray")
- fitness_report: VO2max, lactate tests, medical clearances (Look for: "VO2max", "Лактат", "Medical Clearance", "Кардио тест")
- prescription: Doctor's prescriptions, recommendations (Look for: "Prescription", "Рецепт", "Recommended", "Назначение")
- progress_photo: Physique photos
- training_program: Workout plans
- other: Everything else

CRITICAL: Extract TEST DATE from document content (sample collection date, NOT filename date)!
Generate 2-4 relevant tags in Russian based on document content.

IMPORTANT: Respond ONLY using tool call, no text messages.`
          },
          userMessage
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_document',
              description: 'Классифицирует медицинский документ по названию файла',
              parameters: {
                type: 'object',
                properties: {
                  document_type: {
                    type: 'string',
                    enum: ['inbody', 'blood_test', 'fitness_report', 'progress_photo', 'vo2max', 'caliper', 'prescription', 'training_program', 'other'],
                    description: 'Тип документа'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Список тегов на русском языке (2-4 тега)'
                  },
                  suggested_date: {
                    type: 'string',
                    description: 'Дата в формате YYYY-MM-DD если найдена в названии, иначе null',
                    nullable: true
                  },
                  confidence: {
                    type: 'number',
                    description: 'Уверенность в классификации (0-1)',
                    minimum: 0,
                    maximum: 1
                  }
                },
                required: ['document_type', 'tags', 'suggested_date', 'confidence'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_document' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-classify-document] API error:', response.status, errorText);
      
      // Fallback на базовую классификацию
      return new Response(
        JSON.stringify({
          document_type: 'other',
          tags: [],
          suggested_date: null,
          confidence: 0.1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('[ai-classify-document] Raw response:', JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('[ai-classify-document] No tool call in response');
      return new Response(
        JSON.stringify({
          document_type: 'other',
          tags: [],
          suggested_date: null,
          confidence: 0.1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const classification = JSON.parse(toolCall.function.arguments);
    console.log('[ai-classify-document] Classification:', classification);

    // Validate document type
    const validTypes = ['inbody', 'blood_test', 'fitness_report', 'progress_photo', 'vo2max', 'caliper', 'prescription', 'training_program', 'other'];
    if (!validTypes.includes(classification.document_type)) {
      console.warn(`[ai-classify-document] Invalid type "${classification.document_type}", replacing with "other"`);
      classification.document_type = 'other';
    }

    return new Response(
      JSON.stringify(classification),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-classify-document] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        document_type: 'other',
        tags: [],
        suggested_date: null,
        confidence: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
