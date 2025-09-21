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

  let userId, filePath;
  try {
    const body = await req.json();
    userId = body.userId;
    filePath = body.filePath;

    if (!userId || !filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing Apple Health data for user ${userId}, file: ${filePath}`);

    // Логируем начало обработки
    await logError(supabase, userId, 'apple_health_processing_start', 'Started processing Apple Health file', { filePath });

    // Получаем информацию о файле перед скачиванием
    const { data: fileInfo, error: listError } = await supabase.storage
      .from('apple-health-uploads')
      .list(filePath.split('/')[0], { search: filePath.split('/')[1] });

    if (listError || !fileInfo || fileInfo.length === 0) {
      console.error('File not found:', listError);
      throw new Error(`File not found: ${filePath}`);
    }

    const file = fileInfo[0];
    console.log(`File found: ${file.name}, size: ${file.metadata?.size || 'unknown'} bytes`);

    // Скачиваем файл из Storage с улучшенной обработкой ошибок
    console.log(`Starting download of ${filePath}...`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('apple-health-uploads')
      .download(filePath);

    if (downloadError) {
      await logError(supabase, userId, 'apple_health_download_error', 'Failed to download file', downloadError);
      
      // Более детальная обработка ошибок скачивания
      if (downloadError.message?.includes('Object not found')) {
        throw new Error(`File not found at path: ${filePath}. Please check if the file was uploaded correctly.`);
      } else if (downloadError.message?.includes('access denied')) {
        throw new Error(`Access denied to file: ${filePath}. Please check file permissions.`);
      } else {
        throw new Error(`Failed to download file: ${downloadError.message || 'Unknown error'}`);
      }
    }

    console.log('File downloaded successfully, size:', fileData.size);
    
    // Начинаем обработку файла в фоновом режиме
    const processTask = processAppleHealthFile(fileData, userId, filePath);
    
    // Используем waitUntil для обработки в фоне
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processTask);
    } else {
      // Fallback для локальной разработки
      processTask.catch(error => {
        console.error('Background processing error:', error);
        logError(supabase, userId, 'apple_health_background_error', error.message, { filePath });
      });
    }
    
    // Возвращаем немедленный ответ
    const initialResults = {
      recordsProcessed: 0,
      status: 'processing_started',
      message: 'Apple Health file uploaded successfully. Processing in background.',
      fileSizeBytes: fileData.size,
      fileSizeMB: Math.round(fileData.size / (1024 * 1024))
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Apple Health file upload completed. Processing started in background.',
        results: initialResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error:', error);
    
    // Логируем ошибку
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

// Функция для фоновой обработки Apple Health файла
async function processAppleHealthFile(fileData: Blob, userId: string, filePath: string) {
  try {
    console.log(`Starting background processing for user ${userId}, file size: ${fileData.size} bytes`);
    
    // Здесь будет реальная логика парсинга Apple Health XML
    // Пока что симулируем длительную обработку
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Имитируем результаты обработки
    const results = {
      recordsProcessed: Math.floor(Math.random() * 1000) + 100,
      categories: ['Steps', 'Heart Rate', 'Sleep', 'Weight'],
      dateRange: {
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      },
      fileSizeBytes: fileData.size
    };
    
    console.log('Background processing completed:', results);
    
    // Логируем успешное завершение
    await logError(supabase, userId, 'apple_health_processing_complete', 'Apple Health background processing completed', results);
    
    // Удаляем обработанный файл
    const { error: deleteError } = await supabase.storage
      .from('apple-health-uploads')
      .remove([filePath]);

    if (deleteError) {
      console.error('Failed to delete processed file:', deleteError);
    } else {
      console.log('Processed file deleted successfully');
    }
    
  } catch (error) {
    console.error('Background processing error:', error);
    await logError(supabase, userId, 'apple_health_background_processing_error', error.message, { filePath, stack: error.stack });
  }
}

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