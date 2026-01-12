import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/i18n';

interface ExerciseImageMap {
  [exerciseName: string]: string;
}

// Local storage key for caching images
const STORAGE_KEY = 'exercise_images_cache';

// Load from localStorage
const loadFromCache = (): ExerciseImageMap => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

// Save to localStorage
const saveToCache = (images: ExerciseImageMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
  } catch {
    // Ignore storage errors
  }
};

export function useExerciseImages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [images, setImages] = useState<ExerciseImageMap>(loadFromCache);
  const [isLoading, setIsLoading] = useState(true);

  // Load images from database on mount
  useEffect(() => {
    const loadImages = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Use 'any' type since table is newly created and types not yet synced
        const { data, error } = await (supabase as any)
          .from('exercise_images')
          .select('exercise_name, image_url')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error loading exercise images:', error);
          return;
        }

        if (data) {
          const imageMap: ExerciseImageMap = {};
          data.forEach((item: { exercise_name: string; image_url: string }) => {
            imageMap[item.exercise_name.toLowerCase()] = item.image_url;
          });
          setImages((prev) => ({ ...prev, ...imageMap }));
          saveToCache({ ...images, ...imageMap });
        }
      } catch (error) {
        console.error('Error loading exercise images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [user]);

  const getImageUrl = (exerciseName: string | undefined): string | undefined => {
    if (!exerciseName) return undefined;
    return images[exerciseName.toLowerCase()];
  };

  const setImageUrl = async (exerciseName: string, imageUrl: string) => {
    const normalizedName = exerciseName.toLowerCase();
    
    // Update local state immediately
    setImages((prev) => {
      const updated = { ...prev, [normalizedName]: imageUrl };
      saveToCache(updated);
      return updated;
    });

    // Save to database if user is logged in
    if (user) {
      try {
        // Use 'any' type since table is newly created and types not yet synced
        const { error } = await (supabase as any)
          .from('exercise_images')
          .upsert({
            user_id: user.id,
            exercise_name: normalizedName,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,exercise_name',
          });

        if (error) {
          console.error('Error saving exercise image:', error);
          toast({
            title: i18n.t('workouts:exercises.toast.saveError'),
            description: i18n.t('workouts:exercises.toast.imageSavedLocally'),
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error saving exercise image:', error);
      }
    }
  };

  return {
    images,
    isLoading,
    getImageUrl,
    setImageUrl,
  };
}
