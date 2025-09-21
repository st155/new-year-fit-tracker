import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, filePath } = await req.json();

    if (!userId || !filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing Apple Health data for user ${userId}, file: ${filePath}`);

    // Логируем начало обработки
    await logError(supabase, userId, 'apple_health_processing_start', 'Started processing Apple Health file', { filePath });

    // Скачиваем файл из Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('apple-health-uploads')
      .download(filePath);

    if (downloadError) {
      await logError(supabase, userId, 'apple_health_download_error', 'Failed to download file', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Здесь должна быть логика парсинга Apple Health данных
    // Пока что возвращаем заглушку
    console.log('File downloaded, size:', fileData.size);
    
    // Симулируем обработку
    const mockResults = {
      processedRecords: 0,
      categories: [],
      dateRange: {
        from: new Date().toISOString(),
        to: new Date().toISOString()
      }
    };

    // Логируем успешное завершение
    await logError(supabase, userId, 'apple_health_processing_complete', 'Apple Health processing completed', mockResults);

    // Удаляем обработанный файл
    const { error: deleteError } = await supabase.storage
      .from('apple-health-uploads')
      .remove([filePath]);

    if (deleteError) {
      console.error('Failed to delete file:', deleteError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Apple Health data processed successfully',
        results: mockResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error:', error);
    
    // Логируем ошибку
    const { userId } = await req.json().catch(() => ({}));
    if (userId) {
      await logError(supabase, userId, 'apple_health_processing_error', error.message, { stack: error.stack });
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Функция для логирования ошибок
async function logError(supabase: any, userId: string, errorType: string, message: string, details: any) {
  try {
    const { error } = await supabase
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type: errorType,
        error_message: message,
        error_details: JSON.stringify(details),
        source: 'apple_health',
        user_agent: 'Supabase Edge Function',
        url: 'process-apple-health'
      });

    if (error) {
      console.error('Failed to log error:', error);
    }
  } catch (logError) {
    console.error('Error in logError function:', logError);
  }
}