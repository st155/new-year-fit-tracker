/**
 * Floating control panel for 3D body model
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  RotateCcw, 
  Eye, 
  ZoomIn, 
  ZoomOut,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { CameraView } from '@/lib/three-utils';

interface Body3DControlsProps {
  onReset: () => void;
  onViewChange: (view: CameraView) => void;
  onQualityToggle: () => void;
  quality: 'low' | 'high';
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

export function Body3DControls({
  onReset,
  onViewChange,
  onQualityToggle,
  quality,
  isFullscreen = false,
  onFullscreenToggle,
}: Body3DControlsProps) {
  const views: { label: string; value: CameraView; icon: string }[] = [
    { label: 'Front', value: 'front', icon: '⬆️' },
    { label: 'Back', value: 'back', icon: '⬇️' },
    { label: 'Left', value: 'left', icon: '⬅️' },
    { label: 'Right', value: 'right', icon: '➡️' },
    { label: 'Top', value: 'top', icon: '🔝' },
  ];

  return (
    <Card className="absolute top-4 right-4 p-3 glass-medium border-primary/20 backdrop-blur-xl z-10">
      <div className="flex flex-col gap-2">
        {/* Reset button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          className="w-full justify-start gap-2 text-xs"
        >
          <RotateCcw className="h-3 w-3" />
          Reset View
        </Button>

        {/* View presets */}
        <div className="border-t border-border/50 pt-2 mt-1">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Quick Views
          </p>
          <div className="grid grid-cols-2 gap-1">
            {views.map((view) => (
              <Button
                key={view.value}
                size="sm"
                variant="outline"
                onClick={() => onViewChange(view.value)}
                className="text-xs h-7 px-2"
              >
                <span className="mr-1">{view.icon}</span>
                {view.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Quality toggle */}
        <div className="border-t border-border/50 pt-2 mt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onQualityToggle}
            className="w-full justify-start gap-2 text-xs"
          >
            {quality === 'high' ? (
              <>
                <ZoomOut className="h-3 w-3" />
                High Quality
              </>
            ) : (
              <>
                <ZoomIn className="h-3 w-3" />
                Low Quality
              </>
            )}
          </Button>
        </div>

        {/* Fullscreen toggle */}
        {onFullscreenToggle && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onFullscreenToggle}
            className="w-full justify-start gap-2 text-xs"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3 w-3" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" />
                Fullscreen
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
