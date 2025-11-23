import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[BATCH-PROCESS] Starting batch processing for user:', user.id);

    // Get all pending documents
    const { data: documents, error: docsError } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('[BATCH-PROCESS] Error fetching documents:', docsError);
      throw docsError;
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending documents to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BATCH-PROCESS] Found ${documents.length} pending documents`);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        // Send initial progress
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            total: documents.length,
            message: `Processing ${documents.length} documents...`
          })}\n\n`)
        );

        for (const doc of documents) {
          try {
            console.log(`[BATCH-PROCESS] Processing document ${processed + 1}/${documents.length}: ${doc.file_name}`);

            // Send progress update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: processed + 1,
                total: documents.length,
                documentId: doc.id,
                documentName: doc.file_name,
                status: 'processing'
              })}\n\n`)
            );

            // Update document status to processing
            await supabase
              .from('medical_documents')
              .update({ 
                processing_status: 'processing',
                processing_started_at: new Date().toISOString()
              })
              .eq('id', doc.id);

            // Determine which edge function to call based on document type
            let functionName = '';
            let functionPayload: any = { documentId: doc.id };

            switch (doc.document_type) {
              case 'blood_test':
                functionName = 'parse-lab-report';
                break;
              case 'inbody':
                functionName = 'analyze-inbody';
                break;
              default:
                functionName = 'analyze-medical-document';
                break;
            }

            console.log(`[BATCH-PROCESS] Calling ${functionName} for document ${doc.id}`);

            // Call the appropriate edge function
            const { data: result, error: processError } = await supabase.functions.invoke(
              functionName,
              { body: functionPayload }
            );

            if (processError) {
              throw processError;
            }

            // Update document status to completed
            await supabase
              .from('medical_documents')
              .update({ 
                processing_status: 'completed',
                processing_completed_at: new Date().toISOString()
              })
              .eq('id', doc.id);

            succeeded++;

            // Send success update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'completed',
                current: processed + 1,
                total: documents.length,
                documentId: doc.id,
                documentName: doc.file_name,
                status: 'completed',
                result: result
              })}\n\n`)
            );

            console.log(`[BATCH-PROCESS] ✓ Successfully processed: ${doc.file_name}`);

          } catch (error: any) {
            console.error(`[BATCH-PROCESS] ✗ Error processing ${doc.file_name}:`, {
              error: error.message,
              documentId: doc.id,
              documentType: doc.document_type,
              fileSize: doc.file_size,
              functionName: functionName
            });
            failed++;

            // Update document status to error
            await supabase
              .from('medical_documents')
              .update({ 
                processing_status: 'error',
                processing_error: error.message || error.toString(),
                processing_completed_at: new Date().toISOString()
              })
              .eq('id', doc.id);

            // Send error update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                current: processed + 1,
                total: documents.length,
                documentId: doc.id,
                documentName: doc.file_name,
                status: 'error',
                error: error.message || error.toString()
              })}\n\n`)
            );
          }

          processed++;

          // Add a delay between documents to avoid rate limiting (2 seconds)
          if (processed < documents.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // Send completion message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            total: documents.length,
            succeeded,
            failed,
            message: `Processing complete: ${succeeded} succeeded, ${failed} failed`
          })}\n\n`)
        );

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[BATCH-PROCESS] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
