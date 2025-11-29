import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BulkUploadItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  result?: {
    name: string;
    brand: string;
    productId: string;
  };
  error?: string;
}

interface UploadProgress {
  current: number;
  total: number;
  percentage: number;
}

export function useBulkScanSupplements() {
  const [items, setItems] = useState<BulkUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ current: 0, total: 0, percentage: 0 });
  const cancelRequestedRef = useRef(false);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const newItems: BulkUploadItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));
    
    setItems(prev => [...prev, ...newItems]);
    console.log(`[BULK-SCAN] Added ${files.length} files to queue`);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 600;
          const scale = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.6
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processSingleItem = async (item: BulkUploadItem, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    console.log(`[BULK-SCAN] Processing item: ${item.file.name}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}`);
    
    try {
      // Compress image
      const base64Image = await compressImage(item.file);
      
      // Call scan-supplement-bottle edge function with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout (90s) - server may be busy')), 90000)
      );

      const { data: scanData, error: scanError } = await Promise.race([
        supabase.functions.invoke('scan-supplement-bottle', {
          body: { imageBase64: base64Image }
        }),
        timeoutPromise
      ]) as any;

      if (scanError) throw scanError;
      if (!scanData?.success) throw new Error(scanData?.error || 'Scan failed');

      const { productId, name, brand } = scanData;
      console.log(`[BULK-SCAN] ✅ Scanned: ${name} by ${brand}`);

      // Image upload is now handled by scan-supplement-bottle Edge Function
      console.log(`[BULK-SCAN] ✅ Product processed with image: ${scanData.imageUrl || 'no image'}`);

      // Add to library
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_supplement_library')
          .upsert({
            user_id: user.id,
            product_id: productId,
            source: 'scan',
            scan_count: 1,
          }, { onConflict: 'user_id,product_id' });
      }

      // Trigger enrichment (fire and forget)
      supabase.functions.invoke('enrich-supplement-info', {
        body: { productId }
      }).catch(e => console.error('[BULK-SCAN] Enrichment failed:', e));

      setItems(prev => prev.map(i => 
        i.id === item.id 
          ? { ...i, status: 'success' as const, result: { name, brand, productId } }
          : i
      ));

    } catch (error) {
      // Handle ProgressEvent (network errors like {isTrusted: true})
      let errorMessage: string;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'isTrusted' in error) {
        // Network error (ProgressEvent)
        errorMessage = 'Network error - check your connection and try again';
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else {
        errorMessage = 'Processing failed';
      }
      
      // Check for rate limit, timeout, or network errors that should retry
      const shouldRetry = errorMessage.includes('429') || 
                          errorMessage.includes('rate') ||
                          errorMessage.includes('quota') ||
                          errorMessage.includes('timeout') ||
                          errorMessage.includes('Network error');
      
      if (retryCount < MAX_RETRIES && shouldRetry) {
        const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        console.log(`[BULK-SCAN] ⚠️ ${errorMessage}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return processSingleItem(item, retryCount + 1);
      }
      
      // Log detailed error
      console.error(`[BULK-SCAN] ❌ Error processing ${item.file.name}:`, error);
      
      setItems(prev => prev.map(i => 
        i.id === item.id 
          ? { 
              ...i, 
              status: 'error' as const, 
              error: errorMessage
            }
          : i
      ));
    }
  };

  const startProcessing = useCallback(async () => {
    if (isProcessing || items.length === 0) return;
    
    setIsProcessing(true);
    cancelRequestedRef.current = false;
    setProgress({ current: 0, total: items.length, percentage: 0 });
    
    console.log(`[BULK-SCAN] Starting bulk processing of ${items.length} items`);
    
    let processed = 0;
    for (const item of items) {
      if (cancelRequestedRef.current) {
        console.log('[BULK-SCAN] Processing cancelled by user');
        break;
      }
      
      if (item.status === 'pending') {
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, status: 'processing' as const } : i
        ));
        
        await processSingleItem(item);
        processed++;
        
        setProgress({
          current: processed,
          total: items.length,
          percentage: Math.round((processed / items.length) * 100),
        });
        
        // Rate limiting: 5 seconds between requests
        if (processed < items.length) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    setIsProcessing(false);
    
    const successCount = items.filter(i => i.status === 'success').length;
    const errorCount = items.filter(i => i.status === 'error').length;
    
    console.log(`[BULK-SCAN] Completed: ${successCount} success, ${errorCount} errors`);
    toast.success(`✅ Processed ${successCount} supplements${errorCount ? ` (${errorCount} errors)` : ''}`);
  }, [items, isProcessing]);

  const cancelProcessing = useCallback(() => {
    cancelRequestedRef.current = true;
    console.log('[BULK-SCAN] Cancel requested');
  }, []);

  const reset = useCallback(() => {
    items.forEach(item => {
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setItems([]);
    setProgress({ current: 0, total: 0, percentage: 0 });
    cancelRequestedRef.current = false;
  }, [items]);

  return {
    items,
    isProcessing,
    progress,
    addFiles,
    removeItem,
    startProcessing,
    cancelProcessing,
    reset,
  };
}
