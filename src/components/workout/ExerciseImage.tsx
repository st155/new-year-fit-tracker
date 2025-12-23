import { useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExerciseIcon from './ExerciseIcon';
import { Button } from '@/components/ui/button';

interface ExerciseImageProps {
  exerciseName: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onAddImage?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

export default function ExerciseImage({
  exerciseName,
  imageUrl,
  size = 'md',
  editable = false,
  onAddImage,
  className,
}: ExerciseImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // If no image URL or image failed to load, show icon or placeholder
  if (!imageUrl || hasError) {
    if (editable && onAddImage) {
      return (
        <Button
          variant="outline"
          size="icon"
          onClick={onAddImage}
          className={cn(
            sizeClasses[size],
            'rounded-lg border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-colors flex-shrink-0',
            className
          )}
        >
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
        </Button>
      );
    }

    return (
      <div className={cn(sizeClasses[size], 'flex-shrink-0', className)}>
        <ExerciseIcon name={exerciseName} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'relative rounded-lg overflow-hidden bg-muted flex-shrink-0 group',
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={exerciseName}
        className={cn(
          'w-full h-full object-cover transition-opacity',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
      {editable && onAddImage && (
        <button
          onClick={onAddImage}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <ImagePlus className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
}
