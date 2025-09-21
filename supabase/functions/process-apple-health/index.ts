import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, filePath } = await req.json();

    if (!userId || !filePath) {
      return new Response(JSON.stringify({ error: 'Missing userId or filePath' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing Apple Health file for user: ${userId}, path: ${filePath}`);

    // Получаем файл из storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('apple-health-uploads')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`File downloaded, size: ${fileData.size} bytes`);

    // В реальной реализации здесь был бы парсинг ZIP-архива и извлечение XML данных
    // Для демонстрации возвращаем базовый результат
    const mockResult = {
      recordsProcessed: 1500,
      newMetrics: 15,
      errors: 0,
      message: 'Apple Health data processed successfully (mock implementation)',
      processedAt: new Date().toISOString()
    };

    // Логируем успешную обработку
    const { error: logError } = await supabase
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type: 'apple_health_processing',
        error_message: `Apple Health file processed successfully: ${mockResult.recordsProcessed} records`,
        error_details: mockResult,
        source: 'apple_health'
      });

    if (logError) {
      console.error('Logging error:', logError);
    }

    // Удаляем обработанный файл из storage для экономии места
    await supabase.storage
      .from('apple-health-uploads')
      .remove([filePath]);

    return new Response(JSON.stringify(mockResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Processing error:', error);
    
    // Логируем ошибку
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('error_logs')
        .insert({
          user_id: 'system',
          error_type: 'apple_health_processing_error',
          error_message: error.message,
          error_details: { error: error.toString() },
          source: 'apple_health'
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      error: 'Processing failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});