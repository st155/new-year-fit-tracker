import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import heic2any from 'heic2any';

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

  // Inline SVG placeholder (always works, no external file dependency)
  const PILL_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect fill="#1a1a1a" width="100" height="100" rx="8"/>
  <text x="50" y="60" text-anchor="middle" font-size="40">💊</text>
</svg>
  `)}`;

  // Helper to detect HEIC files
  const isHeicFile = (file: File): boolean => {
    return file.type === 'image/heic' || 
           file.type === 'image/heif' ||
           file.name.toLowerCase().endsWith('.heic') ||
           file.name.toLowerCase().endsWith('.heif');
  };

  // Convert HEIC to JPEG blob
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    console.log(`[BULK-SCAN] 🔄 Converting HEIC to JPEG: ${file.name}`);
    
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8,
    }) as Blob;
    
    // Create new File from blob with .jpg extension
    const newFileName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
    const jpegFile = new File([blob], newFileName, { type: 'image/jpeg' });
    
    console.log(`[BULK-SCAN] ✅ Converted: ${file.name} → ${newFileName} (${Math.round(jpegFile.size / 1024)}KB)`);
    return jpegFile;
  };

  // Create preview by converting to JPEG via Canvas
  const createPreview = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      console.log(`[BULK-SCAN] Creating preview for: ${file.name}, type: ${file.type}, size: ${file.size}`);
      
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200; // Preview size
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to JPEG data URL (works everywhere)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(objectUrl); // Free memory
        console.log(`[BULK-SCAN] ✅ Preview created for: ${file.name}`);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        console.error(`[BULK-SCAN] ❌ Failed to create preview for: ${file.name}`);
        resolve(PILL_PLACEHOLDER); // Inline SVG fallback
      };
      
      img.src = objectUrl;
    });
  };

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    console.log(`[BULK-SCAN] Adding ${files.length} files...`);
    
    // Process files: convert HEIC to JPEG, then create previews
    const newItems: BulkUploadItem[] = await Promise.all(
      files.map(async (originalFile) => {
        // Convert HEIC to JPEG if needed
        let file = originalFile;
        if (isHeicFile(originalFile)) {
          try {
            file = await convertHeicToJpeg(originalFile);
          } catch (err) {
            console.error(`[BULK-SCAN] ❌ HEIC conversion failed for ${originalFile.name}:`, err);
            // Keep original file, will fail later with clear error
          }
        }
        
        return {
          id: `${Date.now()}-${Math.random()}`,
          file, // Use converted file (or original if not HEIC)
          preview: await createPreview(file),
          status: 'pending' as const,
        };
      })
    );
    
    setItems(prev => [...prev, ...newItems]);
    console.log(`[BULK-SCAN] Added ${files.length} files with previews`);
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
    // Check cancellation BEFORE starting
    if (cancelRequestedRef.current) {
      console.log(`[BULK-SCAN] ⏹️ Cancelled before processing: ${item.file.name}`);
      return;
    }
    
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
      
      // Check cancellation BEFORE retry
      if (cancelRequestedRef.current) {
        console.log(`[BULK-SCAN] ⏹️ Cancelled during error handling: ${item.file.name}`);
        return;
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
        
        // Rate limiting: 5 seconds between requests with cancellation check
        if (processed < items.length && !cancelRequestedRef.current) {
          console.log(`[BULK-SCAN] ⏱️ Rate limiting: waiting 5s before next item...`);
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
