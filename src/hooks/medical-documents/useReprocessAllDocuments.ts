import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReprocessProgress {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  currentDocument?: string;
  isProcessing: boolean;
}

interface ReprocessEvent {
  documentId: string;
  fileName?: string;
  oldFileName?: string;
  newFileName?: string;
  category?: string;
  error?: string;
}

export const useReprocessAllDocuments = () => {
  const [progress, setProgress] = useState<ReprocessProgress>({
    current: 0,
    total: 0,
    succeeded: 0,
    failed: 0,
    isProcessing: false,
  });

  const [events, setEvents] = useState<ReprocessEvent[]>([]);

  const startReprocessing = async () => {
    setProgress({
      current: 0,
      total: 0,
      succeeded: 0,
      failed: 0,
      isProcessing: true,
    });
    setEvents([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reprocess-all-documents`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start reprocessing');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            const eventData = JSON.parse(dataMatch[1]);

            switch (eventType) {
              case 'start':
                setProgress(prev => ({ ...prev, total: eventData.total }));
                break;

              case 'progress':
                setProgress(prev => ({
                  ...prev,
                  current: eventData.current,
                  currentDocument: eventData.fileName,
                }));
                break;

              case 'success':
                setProgress(prev => ({
                  ...prev,
                  succeeded: prev.succeeded + 1,
                }));
                setEvents(prev => [...prev, { 
                  documentId: eventData.documentId,
                  oldFileName: eventData.oldFileName,
                  newFileName: eventData.newFileName,
                  category: eventData.category
                }]);
                break;

              case 'error':
                setProgress(prev => ({
                  ...prev,
                  failed: prev.failed + 1,
                }));
                setEvents(prev => [...prev, { 
                  documentId: eventData.documentId,
                  fileName: eventData.fileName,
                  error: eventData.error
                }]);
                break;

              case 'done':
                setProgress(prev => ({
                  ...prev,
                  isProcessing: false,
                }));
                break;
            }
          }
        }
      }
    } catch (error) {
      console.error('[REPROCESS_ALL] Error:', error);
      setProgress(prev => ({ ...prev, isProcessing: false }));
      throw error;
    }
  };

  const reset = () => {
    setProgress({
      current: 0,
      total: 0,
      succeeded: 0,
      failed: 0,
      isProcessing: false,
    });
    setEvents([]);
  };

  return {
    progress,
    events,
    startReprocessing,
    reset,
  };
};
