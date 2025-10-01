import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
  description?: string;
  trigger?: ReactNode;
  className?: string;
  snapPoints?: number[];
}

/**
 * ResponsiveDialog - адаптивный компонент диалога
 * На мобильных устройствах отображается как BottomSheet
 * На десктопе - как обычный Dialog
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  trigger,
  className,
  snapPoints = [50, 90],
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {trigger && <div onClick={() => onOpenChange(true)}>{trigger}</div>}
        <BottomSheet
          open={open}
          onOpenChange={onOpenChange}
          title={title}
          snapPoints={snapPoints}
          className={className}
        >
          {description && (
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
          )}
          {children}
        </BottomSheet>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={className}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * ResponsiveDialogTrigger - компонент для триггера диалога
 * Использовать когда нужно открыть диалог по клику
 */
export function ResponsiveDialogTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
