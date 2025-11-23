import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from '../_shared/cors.ts';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';
import { Logger } from '../_shared/monitoring.ts';
import { EdgeFunctionError, ErrorCode } from '../_shared/error-handling.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new Logger('analyze-medical-document');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Convert to base64 for AI processing (chunked to avoid stack overflow for large files)
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    
    const CHUNK_SIZE = 8192; // 8KB chunks
    for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
      const chunk = uint8Array.subarray(i, Math.min(i + CHUNK_SIZE, uint8Array.length));
      binaryString += String.fromCharCode(...chunk);
    }
    
    const base64 = btoa(binaryString);
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

    // Call Lovable AI for analysis with vision
    await logger.info('Starting document analysis', { 
      documentId, 
      documentType: document.document_type 
    });
    
    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiResponse = await aiClient.complete({
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nAnalyze this document image: ${dataUrl}`
        }
      ],
      maxTokens: 2000
    });

    const summary = aiResponse.content;

    if (!summary) {
      throw new EdgeFunctionError(
        ErrorCode.EXTERNAL_API_ERROR,
        'No analysis generated'
      );
    }

    await logger.info('AI analysis completed successfully', { 
      provider: aiResponse.provider,
      documentType: document.document_type
    });

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