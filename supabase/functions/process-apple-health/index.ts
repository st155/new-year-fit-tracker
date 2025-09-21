import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Глобальные переменные для отслеживания состояния
let isProcessing = false;
let currentRequestId = '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received: ${req.method} ${req.url}`);

  try {
    const body = await req.json();
    const { userId, filePath } = body;

    console.log(`[${requestId}] Processing for user ${userId}, file: ${filePath}`);

    if (!userId || !filePath) {
      console.error(`[${requestId}] Missing parameters: userId=${userId}, filePath=${filePath}`);
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId and filePath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Проверяем, не обрабатывается ли уже файл
    if (isProcessing && currentRequestId !== requestId) {
      console.log(`[${requestId}] Another processing is active: ${currentRequestId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Another file is currently being processed',
          processingRequestId: currentRequestId
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Устанавливаем флаг обработки
    isProcessing = true;
    currentRequestId = requestId;

    // Немедленно возвращаем ответ и запускаем обработку в фоне
    const response = new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Processing started',
        requestId,
        filePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Используем EdgeRuntime.waitUntil для правильной обработки в фоне
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(
        processAppleHealthFileOptimized(userId, filePath, requestId)
          .catch(error => {
            console.error(`[${requestId}] Background processing failed:`, error);
            logError(supabase, userId, 'processing_error', error.message, { 
              requestId, 
              filePath,
              stack: error.stack 
            });
          })
          .finally(() => {
            isProcessing = false;
            currentRequestId = '';
            console.log(`[${requestId}] Processing completed, flags reset`);
          })
      );
    } else {
      // Fallback для обычной обработки
      processAppleHealthFileOptimized(userId, filePath, requestId)
        .catch(error => {
          console.error(`[${requestId}] Background processing failed:`, error);
          logError(supabase, userId, 'processing_error', error.message, { 
            requestId, 
            filePath,
            stack: error.stack 
          });
        })
        .finally(() => {
          isProcessing = false;
          currentRequestId = '';
          console.log(`[${requestId}] Processing completed, flags reset`);
        });
    }

    return response;

  } catch (error) {
    isProcessing = false;
    currentRequestId = '';
    console.error(`[${requestId}] Request processing error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Request processing failed',
        details: error.message,
        requestId 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processAppleHealthFileOptimized(userId: string, filePath: string, requestId: string) {
  const startTime = Date.now();
  
  try {
    console.log(`[${requestId}] Background processing started`);
    await logError(supabase, userId, 'processing_start', 'Starting Apple Health processing', {
      requestId,
      filePath,
      fileSizeMB: 'unknown'
    });
    
    // 1. Проверяем наличие файла
    const { data: fileList, error: listError } = await supabase.storage
      .from('apple-health-uploads')
      .list(filePath.split('/')[0], { 
        search: filePath.split('/')[1] 
      });

    if (listError || !fileList?.length) {
      throw new Error(`File not found: ${filePath}, error: ${listError?.message}`);
    }

    const fileInfo = fileList[0];
    const fileSize = (fileInfo as any)?.metadata?.size || 0;
    const fileSizeMB = Math.round(fileSize / 1024 / 1024);
    
    console.log(`[${requestId}] File found: ${fileSizeMB}MB`);
    
    await logError(supabase, userId, 'apple_health_file_found', 'File located in storage (background)', {
      fileName: fileInfo.name,
      fileSize,
      fileSizeMB,
      lastModified: (fileInfo as any)?.metadata?.lastModified,
      filePath,
      requestId
    });

    // 2. Оптимизированная загрузка файла по частям
    await processLargeAppleHealthFile(userId, filePath, requestId, fileSizeMB);
    
    const endTime = Date.now();
    console.log(`[${requestId}] Processing completed in ${endTime - startTime}ms`);
    
    await logError(supabase, userId, 'processing_complete', 'Apple Health processing completed successfully', {
      requestId,
      filePath,
      fileSizeMB,
      processingTimeMs: endTime - startTime
    });
    
  } catch (error) {
    console.error(`[${requestId}] Processing error:`, error);
    await logError(supabase, userId, 'processing_error', error.message, { 
      requestId, 
      filePath,
      stack: error.stack 
    });
    throw error;
  }
}

async function processLargeAppleHealthFile(userId: string, filePath: string, requestId: string, fileSizeMB: number) {
  console.log(`[${requestId}] Starting ultra-optimized processing for very large file`);
  
  await logError(supabase, userId, 'apple_health_ultra_large_processing', 'Starting ultra-optimized processing for very large file', {
    requestId,
    fileSizeMB
  });

  // Загружаем файл с оптимизированными настройками
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('apple-health-uploads')
    .download(filePath);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download file: ${downloadError?.message}`);
  }

  console.log(`[${requestId}] File downloaded, size: ${Math.round(fileData.size / 1024 / 1024)}MB`);

  // Используем streaming для обработки больших ZIP файлов
  await processZipFileStreaming(fileData, userId, requestId, fileSizeMB);
}

async function processZipFileStreaming(fileData: Blob, userId: string, requestId: string, fileSizeMB: number) {
  console.log(`[${requestId}] Starting streaming processing of ultra large file`);
  
  await logError(supabase, userId, 'apple_health_streaming_start', 'Starting streaming processing of ultra large file', {
    requestId,
    fileSizeMB,
    method: 'external_streaming'
  });

  try {
    // Конвертируем blob в ArrayBuffer для обработки
    const arrayBuffer = await fileData.arrayBuffer();
    console.log(`[${requestId}] File converted to ArrayBuffer`);

    // Извлекаем XML из ZIP используя встроенные возможности
    const xmlContent = await extractXMLFromZip(arrayBuffer, requestId);
    
    if (!xmlContent) {
      throw new Error('No XML content found in ZIP file');
    }

    console.log(`[${requestId}] XML extracted, size: ${Math.round(xmlContent.length / 1024 / 1024)}MB`);

    // Обрабатываем XML с улучшенным streaming алгоритмом
    await parseXMLStreamingOptimized(xmlContent, userId, requestId);
    
  } catch (error) {
    console.error(`[${requestId}] Streaming processing error:`, error);
    throw new Error(`Streaming processing failed: ${error.message}`);
  }
}

async function extractXMLFromZip(arrayBuffer: ArrayBuffer, requestId: string): Promise<string | null> {
  try {
    // Простое извлечение XML из ZIP используя TextDecoder
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Ищем начало XML контента в ZIP файле
    const xmlStartMarker = new TextEncoder().encode('<?xml');
    const xmlEndMarker = new TextEncoder().encode('</HealthData>');
    
    let xmlStart = -1;
    let xmlEnd = -1;
    
    // Ищем начало XML
    for (let i = 0; i < uint8Array.length - xmlStartMarker.length; i++) {
      let match = true;
      for (let j = 0; j < xmlStartMarker.length; j++) {
        if (uint8Array[i + j] !== xmlStartMarker[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        xmlStart = i;
        break;
      }
    }
    
    // Ищем конец XML
    for (let i = uint8Array.length - xmlEndMarker.length; i >= 0; i--) {
      let match = true;
      for (let j = 0; j < xmlEndMarker.length; j++) {
        if (uint8Array[i + j] !== xmlEndMarker[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        xmlEnd = i + xmlEndMarker.length;
        break;
      }
    }
    
    if (xmlStart === -1 || xmlEnd === -1) {
      console.log(`[${requestId}] XML markers not found, trying alternative extraction`);
      
      // Альтернативный метод - конвертируем весь файл в текст и ищем XML
      const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
      const fullText = decoder.decode(uint8Array);
      
      const xmlStartIndex = fullText.indexOf('<?xml');
      const xmlEndIndex = fullText.lastIndexOf('</HealthData>');
      
      if (xmlStartIndex !== -1 && xmlEndIndex !== -1) {
        return fullText.substring(xmlStartIndex, xmlEndIndex + '</HealthData>'.length);
      }
      
      return null;
    }
    
    // Извлекаем XML контент
    const xmlBytes = uint8Array.slice(xmlStart, xmlEnd);
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
    return decoder.decode(xmlBytes);
    
  } catch (error) {
    console.error(`[${requestId}] ZIP extraction error:`, error);
    throw new Error(`Failed to extract XML from ZIP: ${error.message}`);
  }
}

async function parseXMLStreamingOptimized(xmlContent: string, userId: string, requestId: string) {
  const BATCH_SIZE = 25; // Уменьшили для экономии памяти
  const CHUNK_SIZE = 512 * 1024; // 512KB чанки
  const MAX_RECORDS_PER_ITERATION = 100;
  
  let recordsProcessed = 0;
  let currentBatch: any[] = [];
  let position = 0;
  let lastRecordEnd = 0;
  
  console.log(`[${requestId}] Starting optimized XML parsing, content size: ${Math.round(xmlContent.length / 1024 / 1024)}MB`);
  
  await logError(supabase, userId, 'apple_health_streaming_active', 'Streaming processing active', {
    requestId,
    maxRecordsPerBatch: BATCH_SIZE
  });

  try {
    // Обрабатываем XML небольшими чанками для экономии памяти
    while (position < xmlContent.length) {
      const chunkEnd = Math.min(position + CHUNK_SIZE, xmlContent.length);
      let chunk = xmlContent.slice(position, chunkEnd);
      
      // Убеждаемся, что не разрезаем запись пополам
      if (chunkEnd < xmlContent.length) {
        const lastRecordStart = chunk.lastIndexOf('<Record ');
        if (lastRecordStart !== -1) {
          const recordEnd = xmlContent.indexOf('/>', position + lastRecordStart);
          if (recordEnd !== -1 && recordEnd < chunkEnd + 1000) {
            chunk = xmlContent.slice(position, recordEnd + 2);
          }
        }
      }
      
      // Парсим записи в чанке
      const records = await parseRecordsFromChunk(chunk, userId, requestId);
      
      for (const record of records) {
        currentBatch.push(record);
        
        if (currentBatch.length >= BATCH_SIZE) {
          await saveBatch(currentBatch, requestId);
          recordsProcessed += currentBatch.length;
          currentBatch = [];
          
          // Логируем прогресс
          if (recordsProcessed % 500 === 0) {
            console.log(`[${requestId}] Processed ${recordsProcessed} records`);
          }
          
          // Принудительная очистка памяти каждые 1000 записей
          if (recordsProcessed % 1000 === 0) {
            if (typeof Deno !== 'undefined' && Deno.core?.ops?.op_gc) {
              Deno.core.ops.op_gc();
            }
          }
        }
      }
      
      position = chunkEnd;
      
      // Ограничиваем количество записей за одну итерацию
      if (recordsProcessed >= MAX_RECORDS_PER_ITERATION) {
        console.log(`[${requestId}] Reached max records limit for this iteration: ${recordsProcessed}`);
        break;
      }
    }

    // Сохраняем оставшиеся записи
    if (currentBatch.length > 0) {
      await saveBatch(currentBatch, requestId);
      recordsProcessed += currentBatch.length;
    }

    console.log(`[${requestId}] XML parsing complete, processed ${recordsProcessed} records`);
    
    // Создаем сводку данных после обработки
    await createHealthSummary(userId, requestId);
    
    await logError(supabase, userId, 'apple_health_parsing_complete', 'XML parsing completed successfully', {
      requestId,
      totalRecordsProcessed: recordsProcessed
    });
    
  } catch (error) {
    console.error(`[${requestId}] Optimized XML parsing error:`, error);
    throw new Error(`XML parsing failed: ${error.message}`);
  }
}

async function parseRecordsFromChunk(chunk: string, userId: string, requestId: string): Promise<any[]> {
  const records: any[] = [];
  
  try {
    let recordStart = 0;
    
    while (true) {
      recordStart = chunk.indexOf('<Record ', recordStart);
      if (recordStart === -1) break;
      
      const recordEnd = chunk.indexOf('/>', recordStart);
      if (recordEnd === -1) break;
      
      const recordXml = chunk.slice(recordStart, recordEnd + 2);
      const record = parseRecordAttributes(recordXml);
      
      if (record && isValidHealthRecord(record)) {
        records.push({
          user_id: userId,
          record_type: record.type,
          value: record.value,
          unit: record.unit || '',
          start_date: record.startDate,
          end_date: record.endDate || record.startDate,
          source_name: record.sourceName || 'Apple Health',
          source_version: record.sourceVersion,
          device: record.device,
          external_id: record.externalId,
          metadata: {
            imported_from: 'apple_health',
            request_id: requestId
          }
        });
      }
      
      recordStart = recordEnd + 2;
    }
    
  } catch (error) {
    console.error(`[${requestId}] Chunk parsing error:`, error);
  }
  
  return records;
}

function parseRecordAttributes(recordXml: string): any {
  const getAttribute = (name: string): string | null => {
    const regex = new RegExp(`${name}="([^"]+)"`);
    const match = recordXml.match(regex);
    return match ? match[1] : null;
  };

  const type = getAttribute('type');
  const valueStr = getAttribute('value');
  const startDateStr = getAttribute('startDate');
  
  if (!type || !valueStr || !startDateStr) {
    return null;
  }

  return {
    type: type,
    value: parseFloat(valueStr),
    unit: getAttribute('unit'),
    startDate: startDateStr,
    endDate: getAttribute('endDate'),
    sourceName: getAttribute('sourceName'),
    sourceVersion: getAttribute('sourceVersion'),
    device: getAttribute('device'),
    externalId: getAttribute('externalId') || `${type}_${startDateStr}_${valueStr}`
  };
}

function isValidHealthRecord(record: any): boolean {
  return record && 
    record.type && 
    typeof record.value === 'number' && 
    !isNaN(record.value) && 
    record.startDate;
}

async function saveBatch(batch: any[], requestId: string) {
  if (batch.length === 0) return;
  
  try {
    const { error } = await supabase
      .from('health_records')
      .upsert(batch, {
        onConflict: 'external_id',
        ignoreDuplicates: true
      });

    if (error) {
      console.error(`[${requestId}] Batch save error:`, error);
      throw new Error(`Failed to save batch: ${error.message}`);
    }
    
    console.log(`[${requestId}] Saved batch of ${batch.length} records`);
    
  } catch (error) {
    console.error(`[${requestId}] Error saving batch:`, error);
    throw error;
  }
}

async function createHealthSummary(userId: string, requestId: string) {
  try {
    console.log(`[${requestId}] Creating health summary`);
    
    // Вызываем функцию агрегации для сегодняшней даты
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase.rpc('aggregate_daily_health_data', {
      p_user_id: userId,
      p_date: today
    });
    
    if (error) {
      console.error(`[${requestId}] Health summary creation error:`, error);
    } else {
      console.log(`[${requestId}] Health summary created successfully`);
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error creating health summary:`, error);
  }
}

async function logError(supabase: any, userId: string, errorType: string, message: string, details: any) {
  try {
    const { error } = await supabase
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type: errorType,
        error_message: message,
        source: 'apple_health',
        url: 'process-apple-health',
        user_agent: 'Supabase Edge Function',
        error_details: details
      });

    if (error) {
      console.error('Failed to log error:', error);
    }
  } catch (err) {
    console.error('Error logging failed:', err);
  }
}

// Обработчик shutdown для корректного завершения
globalThis.addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown due to:', ev.detail?.reason);
  isProcessing = false;
  currentRequestId = '';
});