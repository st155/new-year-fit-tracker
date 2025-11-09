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
  segmentData?: SegmentData;
  interactive?: boolean;
  showTooltips?: boolean;
}

export function Lazy3DModel({ segmentData, interactive = true, showTooltips = true }: Props) {
  const [show3D, setShow3D] = useState(false);

  // Guard: Check if segmentData is valid
  const hasValidData = segmentData && (
    segmentData.rightArmPercent !== null ||
    segmentData.leftArmPercent !== null ||
    segmentData.trunkPercent !== null ||
    segmentData.rightLegPercent !== null ||
    segmentData.leftLegPercent !== null
  );

  if (!hasValidData) {
    return (
      <div className="h-[500px] flex items-center justify-center border-2 border-destructive/20 rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50">
        <div className="text-center space-y-4 p-8">
          <div className="text-destructive text-lg font-semibold">⚠️ Нет данных для 3D модели</div>
          <p className="text-sm text-muted-foreground max-w-md">
            Сегментные данные отсутствуют. Загрузите новый InBody отчет для отображения 3D модели тела.
          </p>
        </div>
      </div>
    );
  }

  if (!show3D) {
    return (
      <div className="h-[500px] flex items-center justify-center border-2 border-primary/20 rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-ping" />
          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse">
            <Box className="h-10 w-10 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-2">Interactive 3D Body Model</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Visualize your body composition in stunning 3D
            </p>
          </div>
          <Button 
            onClick={() => setShow3D(true)} 
            size="lg" 
            className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/80 hover:to-purple-600/80"
          >
            <Box className="h-5 w-5" />
            Launch 3D Model
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Suspense 
      fallback={
        <div className="h-[500px] flex flex-col items-center justify-center border-2 border-primary/20 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden">
          {/* Progress animation */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-[shimmer_2s_infinite]" />
          </div>
          
          <div className="relative z-10 text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto" />
            <div>
              <p className="text-lg font-semibold mb-1 animate-pulse">Loading 3D Model</p>
              <p className="text-sm text-muted-foreground">
                Preparing visualization...
              </p>
            </div>
          </div>
          
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
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
