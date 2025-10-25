import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Box } from 'lucide-react';

const HumanBodyModel = lazy(() => 
  import('./HumanBodyModel').then(m => ({ default: m.HumanBodyModel }))
);

interface SegmentData {
  rightArmPercent: number | null;
  leftArmPercent: number | null;
  trunkPercent: number | null;
  rightLegPercent: number | null;
  leftLegPercent: number | null;
}

interface Props {
  segmentData: SegmentData;
  interactive?: boolean;
  showTooltips?: boolean;
}

export function Lazy3DModel({ segmentData, interactive = true, showTooltips = true }: Props) {
  const [show3D, setShow3D] = useState(false);

  if (!show3D) {
    return (
      <div className="h-[400px] flex items-center justify-center border border-border rounded-lg bg-card/50">
        <Button onClick={() => setShow3D(true)} size="lg" className="gap-2">
          <Box className="h-5 w-5" />
          Показать 3D модель
        </Button>
      </div>
    );
  }

  return (
    <Suspense 
      fallback={
        <div className="h-[400px] flex flex-col items-center justify-center border border-border rounded-lg bg-card/50">
          <Skeleton className="w-full h-full rounded-lg" />
          <span className="absolute text-sm text-muted-foreground animate-pulse">
            Загрузка 3D модели...
          </span>
        </div>
      }
    >
      <HumanBodyModel 
        segmentData={segmentData} 
        interactive={interactive}
        showTooltips={showTooltips}
      />
    </Suspense>
  );
}
