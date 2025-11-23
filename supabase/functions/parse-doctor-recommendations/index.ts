import { createServiceClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface RecommendationExtraction {
  supplement_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  rationale?: string;
  confidence_score: number;
  doctor_name?: string;
  prescription_date?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PARSE-RX] Starting recommendation extraction for document:', documentId);

    // Check if recommendations already exist (prevent duplicates)
    const { data: existingRecs, error: checkError } = await supabase
      .from('doctor_recommendations')
      .select('id')
      .eq('document_id', documentId)
      .limit(1);

    if (checkError) {
      console.error('[PARSE-RX] Error checking existing recommendations:', checkError);
    }

    if (existingRecs && existingRecs.length > 0) {
      console.log('[PARSE-RX] ⏭️ Recommendations already exist for this document. Skipping extraction.');
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: 0,
          message: 'Recommendations already extracted for this document'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch document details
    const { data: document, error: docError } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('[PARSE-RX] Document not found:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update processing status
    await supabase
      .from('medical_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    console.log('[PARSE-RX] Downloading PDF from storage:', document.storage_path);

    // Download PDF from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('medical-documents')
      .download(document.storage_path);

    if (storageError || !fileData) {
      console.error('[PARSE-RX] Storage download error:', storageError);
      await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'error',
          processing_error: 'Failed to download PDF from storage'
        })
        .eq('id', documentId);
      
      return new Response(
        JSON.stringify({ error: 'Failed to download PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PARSE-RX] Converting PDF to base64...');

    // Convert to base64 using chunked pattern to avoid stack overflow
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    const chunkSize = 8192; // 8KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64Pdf = btoa(binaryString);

    console.log('[PARSE-RX] Sending to Gemini for recommendation extraction...');

    // Send to Gemini 2.5 Pro for extraction
    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash-exp',
        messages: [
          {
            role: 'system',
            content: `You are a medical document parser specialized in extracting doctor's supplement recommendations from clinical notes, prescriptions, and consultation reports.

Extract ALL supplement recommendations from the document. For each recommendation, identify:
- supplement_name (e.g., "Vitamin D3", "Omega-3", "Magnesium")
- dosage (e.g., "5000 IU", "1000mg", "400mg")
- frequency (e.g., "daily", "twice daily", "morning", "before bed")
- duration (e.g., "3 months", "ongoing", "until retest")
- rationale (why the doctor recommended it, e.g., "low vitamin D levels", "cardiovascular support")
- doctor_name (if mentioned in document)
- prescription_date (date of the recommendation, if mentioned)
- confidence_score (0-1, how confident you are in the extraction accuracy)

Look for keywords like:
- "Recommended:", "Prescription:", "Supplement regimen:", "Start taking:", "Continue with:"
- "Take", "Use", "Add to protocol", "Begin supplementation"

Return ONLY a valid JSON object with this structure:
{
  "recommendations": [
    {
      "supplement_name": "string",
      "dosage": "string or null",
      "frequency": "string or null",
      "duration": "string or null",
      "rationale": "string or null",
      "confidence_score": number (0-1),
      "doctor_name": "string or null",
      "prescription_date": "YYYY-MM-DD or null"
    }
  ]
}

If NO recommendations are found, return: {"recommendations": []}

Do NOT wrap the JSON in markdown code blocks. Return raw JSON only.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all supplement recommendations from this medical document.'
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
        max_tokens: 8000,
        temperature: 0.1
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[PARSE-RX] Gemini API error:', errorText);
      await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'error',
          processing_error: 'Gemini API request failed'
        })
        .eq('id', documentId);
      
      return new Response(
        JSON.stringify({ error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawContent = geminiData.choices[0]?.message?.content || '{}';
    
    console.log('[PARSE-RX] Raw Gemini response (first 500 chars):', rawContent.substring(0, 500));

    // Robust JSON extraction - remove markdown wrappers
    let cleanedJson = rawContent.trim();
    cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, '');
    cleanedJson = cleanedJson.replace(/```\s*$/i, '');
    cleanedJson = cleanedJson.trim();

    // Fallback: extract JSON from text
    if (!cleanedJson.startsWith('{')) {
      const firstBrace = cleanedJson.indexOf('{');
      const lastBrace = cleanedJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
      }
    }

    let extractedData: { recommendations: RecommendationExtraction[] };
    try {
      extractedData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('[PARSE-RX] JSON parse error:', parseError);
      console.error('[PARSE-RX] Cleaned JSON:', cleanedJson.substring(0, 1000));
      await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'error',
          processing_error: 'Failed to parse AI response'
        })
        .eq('id', documentId);
      
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recommendations = extractedData.recommendations || [];
    console.log(`[PARSE-RX] Extracted ${recommendations.length} recommendations`);

    // Insert recommendations into database
    if (recommendations.length > 0) {
      const recommendationsToInsert = recommendations.map(rec => ({
        user_id: document.user_id,
        document_id: documentId,
        supplement_name: rec.supplement_name,
        dosage: rec.dosage || null,
        frequency: rec.frequency || null,
        duration: rec.duration || null,
        rationale: rec.rationale || null,
        confidence_score: rec.confidence_score,
        doctor_name: rec.doctor_name || null,
        prescription_date: rec.prescription_date || null,
        status: 'pending'
      }));

      const { error: insertError } = await supabase
        .from('doctor_recommendations')
        .insert(recommendationsToInsert);

      if (insertError) {
        console.error('[PARSE-RX] Database insert error:', insertError);
        await supabase
          .from('medical_documents')
          .update({ 
            processing_status: 'error',
            processing_error: 'Failed to save recommendations'
          })
          .eq('id', documentId);
        
        return new Response(
          JSON.stringify({ error: 'Failed to save recommendations' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[PARSE-RX] Successfully saved recommendations to database');
    }

    // Update document processing status
    await supabase
      .from('medical_documents')
      .update({ 
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    console.log(`[PARSE-RX] ✅ Extraction complete. Found ${recommendations.length} recommendations.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: recommendations.length,
        recommendations: recommendations
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PARSE-RX] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
