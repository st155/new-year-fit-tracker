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

  const logger = new Logger('compare-medical-documents');

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

    const { documentIds } = await req.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      throw new Error('At least 2 document IDs required for comparison');
    }

    console.log(`Comparing documents ${documentIds.join(', ')} for user ${user.id}`);

    // Fetch all documents
    const { data: documents, error: docsError } = await supabase
      .from('medical_documents')
      .select('*')
      .in('id', documentIds)
      .eq('user_id', user.id);

    if (docsError || !documents || documents.length < 2) {
      throw new Error('Could not fetch documents for comparison');
    }

    // Build comparison prompt
    const docSummaries = documents.map((doc, idx) => {
      return `
Document ${idx + 1} (${doc.document_type}, dated ${doc.document_date || 'unknown'}):
${doc.ai_summary || 'No AI summary available'}

Extracted Data:
${JSON.stringify(doc.ai_extracted_data || {}, null, 2)}
`;
    }).join('\n---\n');

    const prompt = `Compare the following medical/fitness documents and provide a detailed analysis:

${docSummaries}

Please provide:
1. **Key Changes**: What are the main differences between these documents?
2. **Progress Analysis**: Is there improvement, decline, or stability in key metrics?
3. **Trends**: What trends can you identify?
4. **Recommendations**: Based on the comparison, what recommendations would you make?
5. **Areas of Concern**: Are there any concerning changes?

Format the response in clear, organized sections with specific metrics and values.`;

    await logger.info('Starting document comparison', { 
      userId: user.id, 
      documentCount: documentIds.length 
    });
    
    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiResponse = await aiClient.complete({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const comparisonAnalysis = aiResponse.content;

    if (!comparisonAnalysis) {
      throw new EdgeFunctionError(
        ErrorCode.EXTERNAL_API_ERROR,
        'No comparison analysis generated'
      );
    }

    await logger.info('Comparison analysis completed successfully', { 
      provider: aiResponse.provider,
      documentsCompared: documents.length
    });

    // Update the first document with comparison results
    const comparisonResult = {
      compared_documents: documentIds,
      comparison_date: new Date().toISOString(),
      analysis: comparisonAnalysis
    };

    const { error: updateError } = await supabase
      .from('medical_documents')
      .update({
        compared_with: documentIds.filter(id => id !== documentIds[0]),
        comparison_results: comparisonResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentIds[0]);

    if (updateError) {
      console.error('Failed to update document:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: comparisonAnalysis,
        documents: documents.map(d => ({
          id: d.id,
          type: d.document_type,
          date: d.document_date
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in compare-medical-documents:', error);
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
