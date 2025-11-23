import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import { corsHeaders } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[PARSE-LAB-REPORT] Starting lab report parsing');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
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
      throw new Error('Document ID is required');
    }

    console.log(`[PARSE-LAB-REPORT] Processing document ${documentId} for user ${user.id}`);

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Get document URL from storage
    const { data: fileData } = supabase.storage
      .from('medical-documents')
      .getPublicUrl(document.storage_path);

    console.log('[PARSE-LAB-REPORT] Fetching PDF from storage');

    // Fetch PDF file
    const pdfResponse = await fetch(fileData.publicUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    console.log(`[PARSE-LAB-REPORT] PDF size: ${pdfBuffer.byteLength} bytes`);
    
    // Extract text from PDF using pdf-lib
    console.log('[PARSE-LAB-REPORT] Extracting text from PDF');
    let fullText = '';
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      // Extract text from each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      console.log(`[PARSE-LAB-REPORT] Extracted ${fullText.length} characters from ${pages.length} pages`);
    } catch (extractError) {
      console.error('[PARSE-LAB-REPORT] PDF text extraction failed:', extractError);
      throw new Error('Failed to extract text from PDF: ' + extractError.message);
    }

    console.log('[PARSE-LAB-REPORT] Sending to OpenAI for analysis');

    // Use regular GPT-4 with extracted text
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a medical lab report parser. Extract ALL biomarkers from the lab report text in JSON format.

CRITICAL INSTRUCTIONS FOR DATE EXTRACTION:
- Find the test/sample collection date in the document
- Look for: "Date du prélèvement", "Test Date", "Collection Date", "Datum", "Date de l'examen"
- Format as YYYY-MM-DD (e.g., if you see "14.11.2025", convert to "2025-11-14")
- NEVER use today's date - only the date from the document!
- This date is CRITICAL for tracking trends over time

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "laboratory": "Lab name",
  "test_date": "YYYY-MM-DD",
  "patient_info": {
    "name": "Patient name if available",
    "date_of_birth": "DOB if available"
  },
  "biomarkers": [
    {
      "name": "Biomarker name as written in the report",
      "value": numeric_value,
      "unit": "unit as string",
      "reference_range_min": numeric_value_or_null,
      "reference_range_max": numeric_value_or_null,
      "reference_range_text": "original text like '<6.2' or '4.0-10.0'",
      "category": "category if visible (Lipides, Hormones, etc)"
    }
  ]
}

Extract every single biomarker value you can find, even if small or in footnotes.`
          },
          {
            role: 'user',
            content: `Parse this lab report text and extract all biomarker data:\n\n${fullText}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    const openAiData = await openAiResponse.json();

    if (!openAiData.choices?.[0]?.message?.content) {
      console.error('[PARSE-LAB-REPORT] OpenAI response error:', openAiData);
      throw new Error('Failed to parse PDF with OpenAI');
    }

    let extractedData;
    try {
      const content = openAiData.choices[0].message.content;
      // Remove markdown code blocks if present
      const jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[PARSE-LAB-REPORT] Failed to parse OpenAI response:', openAiData.choices[0].message.content);
      throw new Error('Failed to parse structured data from AI response');
    }

    console.log(`[PARSE-LAB-REPORT] Extracted ${extractedData.biomarkers?.length || 0} biomarkers`);

    // Fetch all biomarker aliases for fuzzy matching
    const { data: aliases, error: aliasesError } = await supabase
      .from('biomarker_aliases')
      .select('*, biomarker_master(*)');

    if (aliasesError) {
      console.error('[PARSE-LAB-REPORT] Error fetching aliases:', aliasesError);
    }

    const results = [];

    // Process each biomarker
    for (const biomarker of extractedData.biomarkers || []) {
      try {
        console.log(`[PARSE-LAB-REPORT] Processing biomarker: ${biomarker.name}`);

        // Find matching biomarker by fuzzy matching alias
        const matchedAlias = aliases?.find(a => 
          a.alias.toLowerCase() === biomarker.name.toLowerCase() ||
          a.alias.toLowerCase().includes(biomarker.name.toLowerCase()) ||
          biomarker.name.toLowerCase().includes(a.alias.toLowerCase())
        );

        const biomarkerMaster = matchedAlias?.biomarker_master;

        // Normalize value to standard unit
        let normalizedValue = biomarker.value;
        let normalizedUnit = biomarker.unit;

        if (biomarkerMaster) {
          normalizedUnit = biomarkerMaster.standard_unit;
          
          // Apply unit conversion if needed
          const conversionFactors = biomarkerMaster.conversion_factors || {};
          if (biomarker.unit !== biomarkerMaster.standard_unit && conversionFactors[biomarker.unit]) {
            normalizedValue = biomarker.value * conversionFactors[biomarker.unit];
            console.log(`[PARSE-LAB-REPORT] Converted ${biomarker.value} ${biomarker.unit} to ${normalizedValue} ${normalizedUnit}`);
          }
        }

        // Insert into lab_test_results
        const { data: insertedResult, error: insertError } = await supabase
          .from('lab_test_results')
          .insert({
            user_id: user.id,
            document_id: documentId,
            biomarker_id: biomarkerMaster?.id || null,
            raw_test_name: biomarker.name,
            value: biomarker.value,
            unit: biomarker.unit,
            normalized_value: normalizedValue,
            normalized_unit: normalizedUnit,
            laboratory_name: extractedData.laboratory,
            ref_range_min: biomarker.reference_range_min,
            ref_range_max: biomarker.reference_range_max,
            ref_range_unit: biomarker.unit,
            ref_range_source: 'lab_provided',
            test_date: extractedData.test_date,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[PARSE-LAB-REPORT] Error inserting biomarker ${biomarker.name}:`, insertError);
        } else {
          results.push(insertedResult);
          console.log(`[PARSE-LAB-REPORT] ✓ Saved biomarker: ${biomarker.name}`);
        }
      } catch (biomarkerError) {
        console.error(`[PARSE-LAB-REPORT] Error processing biomarker ${biomarker.name}:`, biomarkerError);
      }
    }

    // Update medical document with REAL test date from PDF + AI processing flag
    const testDate = extractedData.test_date || document.uploaded_at?.split('T')[0];
    
    if (!extractedData.test_date) {
      console.warn('[PARSE-LAB-REPORT] ⚠️ Test date not found in document, using upload date as fallback');
    } else {
      console.log(`[PARSE-LAB-REPORT] ✓ Using test date from document: ${testDate}`);
    }
    
    await supabase
      .from('medical_documents')
      .update({
        document_date: testDate,  // CRITICAL: Use date from document, not upload date!
        ai_processed: true,
        ai_summary: `Извлечено ${results.length} биомаркеров из ${extractedData.laboratory || 'лаборатории'}`,
        ai_extracted_data: {
          laboratory: extractedData.laboratory,
          test_date: extractedData.test_date,
          biomarker_count: results.length
        }
      })
      .eq('id', documentId);

    console.log(`[PARSE-LAB-REPORT] ✓ Completed! Saved ${results.length} biomarkers`);

    return new Response(
      JSON.stringify({
        success: true,
        biomarkers_extracted: results.length,
        results: results,
        laboratory: extractedData.laboratory,
        test_date: extractedData.test_date
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[PARSE-LAB-REPORT] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
