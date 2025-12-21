import { createServiceClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Normalize action_type from plural/variant forms to valid singular DB values
const normalizeActionType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'tests': 'test',
    'supplements': 'supplement',
    'medications': 'medication',
    'exercises': 'exercise',
    'consultations': 'consultation',
    'lifestyle_changes': 'lifestyle',
    'lifestyle_change': 'lifestyle',
    'diet': 'lifestyle',
    'appointments': 'consultation',
    'appointment': 'consultation',
    'follow_ups': 'consultation',
    'follow_up': 'consultation',
    'other': 'lifestyle'
  };
  const normalized = type.toLowerCase().trim();
  return typeMap[normalized] || normalized;
};

interface ActionItemExtraction {
  action_type: 'supplement' | 'exercise' | 'lifestyle' | 'test' | 'medication' | 'consultation';
  name: string;
  details?: string;
  dosage?: string;
  frequency?: string;
  schedule?: string; // "1-0-1" format
  duration?: string;
  rationale?: string;
  priority?: 'high' | 'medium' | 'low';
  confidence_score: number;
  doctor_name?: string;
  prescription_date?: string;
}

interface LegacyRecommendationExtraction {
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

    // Check if action items already exist (prevent duplicates)
    const { data: existingActions, error: checkActionsError } = await supabase
      .from('doctor_action_items')
      .select('id')
      .eq('document_id', documentId)
      .limit(1);

    if (checkActionsError) {
      console.error('[PARSE-RX] Error checking existing action items:', checkActionsError);
    }

    if (existingActions && existingActions.length > 0) {
      console.log('[PARSE-RX] ⏭️ Action items already exist for this document. Skipping extraction.');
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: 0,
          message: 'Action items already extracted for this document'
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

    console.log('[PARSE-RX] Sending to Gemini for comprehensive recommendation extraction...');

    // Send to Gemini 2.5 Pro for extraction - EXPANDED PROMPT
    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a medical document parser specialized in extracting ALL doctor's recommendations from clinical notes, prescriptions, and consultation reports.

Extract ALL recommendations grouped by type:

1. **supplements** - Vitamins, minerals, nutraceuticals, dietary supplements
   - Look for dosage formats like "1-0-1" (morning-noon-evening), "2x daily", "500mg"
   
2. **medications** - Pharmaceutical drugs, prescriptions
   
3. **exercises** - Physical therapy, exercises, rehabilitation activities
   - Examples: "ЛФК", "лечебная физкультура", "физиотерапия", "растяжка"
   
4. **lifestyle** - Lifestyle changes, habits, wellness practices
   - Examples: "сауна", "контрастный душ", "режим сна", "hydration"
   
5. **tests** - Follow-up tests, lab work, diagnostics
   - Examples: "повторный анализ", "УЗИ", "MRI", "blood panel"
   
6. **consultations** - Follow-up appointments, specialist visits
   - Examples: "консультация эндокринолога", "follow-up in 3 months"

For each item extract:
- action_type: one of [supplement, medication, exercise, lifestyle, test, consultation]
- name: name of the item
- details: additional details or description
- dosage: dosage if applicable (for supplements/medications)
- frequency: how often (daily, weekly, etc.)
- schedule: timing format like "1-0-1" (morning-noon-evening) or "утром", "перед сном"
- duration: how long to take/do
- rationale: why it was recommended
- priority: high/medium/low based on emphasis in document
- doctor_name: name of the prescribing doctor
- prescription_date: date in YYYY-MM-DD format
- confidence_score: 0-1, accuracy confidence

Return ONLY valid JSON:
{
  "action_items": [
    {
      "action_type": "supplement",
      "name": "Vitamin D3",
      "dosage": "5000 IU",
      "frequency": "daily",
      "schedule": "1-0-0",
      "duration": "3 months",
      "rationale": "low vitamin D levels",
      "priority": "high",
      "doctor_name": "Dr. Smith",
      "prescription_date": "2025-01-15",
      "confidence_score": 0.95
    }
  ],
  "doctor_info": {
    "name": "Dr. Name from document",
    "date": "YYYY-MM-DD"
  }
}

If NO recommendations found, return: {"action_items": [], "doctor_info": null}

Do NOT wrap JSON in markdown code blocks. Return raw JSON only.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL recommendations from this medical document, including supplements, exercises, tests, lifestyle changes, and follow-up appointments.'
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
        max_tokens: 12000,
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
    
    console.log('[PARSE-RX] Raw Gemini response (first 1000 chars):', rawContent.substring(0, 1000));

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

    let extractedData: { 
      action_items: ActionItemExtraction[]; 
      doctor_info?: { name?: string; date?: string } | null;
      // Legacy format support
      recommendations?: LegacyRecommendationExtraction[];
    };
    
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

    const actionItems = extractedData.action_items || [];
    const doctorInfo = extractedData.doctor_info;
    
    console.log(`[PARSE-RX] Extracted ${actionItems.length} action items`);

    // Insert action items into new table
    if (actionItems.length > 0) {
      const actionItemsToInsert = actionItems.map(item => {
        // Generate protocol tag
        const doctorName = item.doctor_name || doctorInfo?.name || null;
        const prescriptionDate = item.prescription_date || doctorInfo?.date || null;
        let protocolTag: string | null = null;
        
        if (doctorName) {
          const dateStr = prescriptionDate 
            ? new Date(prescriptionDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
            : new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
          protocolTag = `Протокол ${doctorName} - ${dateStr}`;
        }

        return {
          user_id: document.user_id,
          document_id: documentId,
          action_type: normalizeActionType(item.action_type),
          name: item.name,
          details: item.details || null,
          dosage: item.dosage || null,
          frequency: item.frequency || null,
          schedule: item.schedule || null,
          duration: item.duration || null,
          rationale: item.rationale || null,
          priority: item.priority || 'medium',
          confidence_score: item.confidence_score,
          doctor_name: doctorName,
          prescription_date: prescriptionDate,
          protocol_tag: protocolTag,
          status: 'pending'
        };
      });

      const { error: insertError } = await supabase
        .from('doctor_action_items')
        .insert(actionItemsToInsert);

      if (insertError) {
        console.error('[PARSE-RX] Database insert error for action_items:', insertError);
        // Don't fail completely, continue to save supplements to legacy table
      } else {
        console.log('[PARSE-RX] Successfully saved action items to database');
      }
    }

    // Also insert supplements to legacy doctor_recommendations table for backward compatibility
    const supplements = actionItems.filter(item => item.action_type === 'supplement');
    
    if (supplements.length > 0) {
      const recommendationsToInsert = supplements.map(rec => ({
        user_id: document.user_id,
        document_id: documentId,
        supplement_name: rec.name,
        dosage: rec.dosage || null,
        frequency: rec.frequency || rec.schedule || null,
        duration: rec.duration || null,
        rationale: rec.rationale || null,
        confidence_score: rec.confidence_score,
        doctor_name: rec.doctor_name || doctorInfo?.name || null,
        prescription_date: rec.prescription_date || doctorInfo?.date || null,
        status: 'pending'
      }));

      // Check if legacy recommendations already exist
      const { data: existingRecs } = await supabase
        .from('doctor_recommendations')
        .select('id')
        .eq('document_id', documentId)
        .limit(1);

      if (!existingRecs || existingRecs.length === 0) {
        const { error: insertError } = await supabase
          .from('doctor_recommendations')
          .insert(recommendationsToInsert);

        if (insertError) {
          console.error('[PARSE-RX] Database insert error for legacy recommendations:', insertError);
        } else {
          console.log('[PARSE-RX] Also saved to legacy doctor_recommendations table');
        }
      }
    }

    // Update document processing status
    await supabase
      .from('medical_documents')
      .update({ 
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    console.log(`[PARSE-RX] ✅ Extraction complete. Found ${actionItems.length} action items.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: actionItems.length,
        action_items: actionItems,
        doctor_info: doctorInfo
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
