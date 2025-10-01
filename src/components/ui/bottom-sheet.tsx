import { ReactNode, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[]; // Высоты в процентах [25, 50, 75, 100]
  defaultSnapPoint?: number;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  snapPoints = [50, 90],
  defaultSnapPoint = 0,
  className,
}: BottomSheetProps) {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(defaultSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const dragDistance = currentY - startY;
    const threshold = 100;

    if (dragDistance > threshold) {
      // Swipe down - close or go to lower snap point
      if (currentSnapPoint === 0 || snapPoints.length === 1) {
        onOpenChange(false);
      } else {
        setCurrentSnapPoint(Math.max(0, currentSnapPoint - 1));
      }
    } else if (dragDistance < -threshold) {
      // Swipe up - go to higher snap point
      if (currentSnapPoint < snapPoints.length - 1) {
        setCurrentSnapPoint(currentSnapPoint + 1);
      }
    }

    setStartY(0);
    setCurrentY(0);
  };

  const getHeight = () => {
    const baseHeight = snapPoints[currentSnapPoint];
    if (isDragging && currentY !== 0) {
      const dragDelta = ((currentY - startY) / window.innerHeight) * 100;
      return Math.max(10, Math.min(100, baseHeight - dragDelta));
    }
    return baseHeight;
  };

  if (!open) return null;

  const sheet = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-background rounded-t-3xl shadow-2xl',
          'transition-all duration-300 ease-out',
          'border-t-2 border-border/50',
          className
        )}
        style={{
          height: `${getHeight()}vh`,
          transform: isDragging ? 'none' : undefined,
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto h-full pb-6 px-6">
          {children}
        </div>
      </div>
    </>
  );

  return createPortal(sheet, document.body);
}

// Пример использования с хуком
export function useBottomSheet() {
  const [open, setOpen] = useState(false);

  return {
    open,
    openSheet: () => setOpen(true),
    closeSheet: () => setOpen(false),
    toggleSheet: () => setOpen(!open),
  };
}
