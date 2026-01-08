import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supplementsApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export function useProcessSupplementPhoto() {
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: async (imageBase64: string) => {
      console.log('[PHOTO-PROCESSING] Sending image to Edge Function...');
      
      const { data, error } = await supplementsApi.processPhoto(imageBase64);

      if (error) {
        console.error('[PHOTO-PROCESSING] Edge Function error:', error);
        throw error;
      }

      if (!data.success || !data.processedImage) {
        throw new Error(data.error || 'Failed to process image');
      }

      console.log('[PHOTO-PROCESSING] Successfully processed image');
      return data.processedImage as string;
    },
    onError: (error) => {
      console.error('[PHOTO-PROCESSING] Mutation error:', error);
      toast.error(t('toast.photoUploadFailed'));
    },
  });
}
