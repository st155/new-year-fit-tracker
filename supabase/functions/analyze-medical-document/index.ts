import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { documentId } = await req.json();

    if (!documentId) {
      throw new Error('Document ID required');
    }

    console.log(`Analyzing document ${documentId} for user ${user.id}`);

    // Fetch document details
    const { data: document, error: docError } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Download document from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('medical-documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download document');
    }

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = document.mime_type || 'application/pdf';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Prepare AI prompt based on document type
    let prompt = '';
    
    switch (document.document_type) {
      case 'inbody':
        prompt = `Analyze this InBody body composition report. Extract and provide:
1. Key metrics (weight, body fat %, skeletal muscle mass, BMI, etc.)
2. Segmental analysis (if available)
3. Health assessment and recommendations
4. Changes from previous measurements (if mentioned)
5. Areas of concern or improvement

Format the response in a structured way with clear sections.`;
        break;
        
      case 'blood_test':
        prompt = `Analyze this blood test report. Provide:
1. All test results with normal ranges
2. Values outside normal ranges (highlight)
3. Health implications
4. Recommendations based on results
5. Trends if multiple dates present

Format clearly with sections for easy reading.`;
        break;
        
      case 'medical_report':
        prompt = `Analyze this medical report. Extract:
1. Main diagnosis or findings
2. Recommended treatments or procedures
3. Medications prescribed
4. Follow-up requirements
5. Important notes or warnings

Summarize in clear, organized sections.`;
        break;
        
      case 'prescription':
        prompt = `Analyze this prescription. List:
1. All medications with dosages
2. Frequency and duration
3. Special instructions
4. Potential side effects or warnings
5. When to take each medication

Organize clearly for easy reference.`;
        break;
        
      default:
        prompt = `Analyze this medical/fitness document. Extract all relevant information including:
1. Main findings or measurements
2. Key metrics and values
3. Recommendations or instructions
4. Important dates
5. Any concerns or follow-up items

Provide a clear, structured summary.`;
    }

    // Call Lovable AI for analysis
    console.log('Calling Lovable AI for document analysis...');
    
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
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url',
                image_url: { url: dataUrl }
              }
            ]
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No analysis generated');
    }

    console.log('AI analysis completed successfully');

    // Extract structured data based on document type
    let extractedData: any = {};
    
    if (document.document_type === 'inbody') {
      // Try to extract numeric values for InBody
      extractedData = {
        weight: extractWeightFromText(summary),
        body_fat_percentage: extractBodyFatFromText(summary),
        skeletal_muscle_mass: extractMuscleMassFromText(summary),
        analyzed_at: new Date().toISOString()
      };
    }

    // Update document with AI analysis
    const { error: updateError } = await supabase
      .from('medical_documents')
      .update({
        ai_summary: summary,
        ai_extracted_data: extractedData,
        ai_processed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document:', updateError);
      throw new Error('Failed to save analysis');
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        extractedData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-medical-document:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper functions to extract metrics from AI text
function extractWeightFromText(text: string): number | null {
  const weightMatch = text.match(/weight[:\s]+(\d+\.?\d*)\s*kg/i);
  return weightMatch ? parseFloat(weightMatch[1]) : null;
}

function extractBodyFatFromText(text: string): number | null {
  const fatMatch = text.match(/body fat[:\s]+(\d+\.?\d*)\s*%/i);
  return fatMatch ? parseFloat(fatMatch[1]) : null;
}

function extractMuscleMassFromText(text: string): number | null {
  const muscleMatch = text.match(/skeletal muscle mass[:\s]+(\d+\.?\d*)\s*kg/i);
  return muscleMatch ? parseFloat(muscleMatch[1]) : null;
}