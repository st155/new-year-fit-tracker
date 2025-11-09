import { Canvas } from '@react-three/fiber';
import { 
  PerspectiveCamera, 
  OrbitControls,
} from '@react-three/drei';
import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { getDeviceCapabilities, CAMERA_PRESETS, type CameraView, PerformanceMonitor } from '@/lib/three-utils';
import { Body3DControls } from './Body3DControls';
import { Body3DEnvironment } from './Body3DEnvironment';
import { AnatomicalBodyModel } from './AnatomicalBodyModel';
import { BodyModelErrorBoundary } from './BodyModelErrorBoundary';
import * as THREE from 'three';

export interface SegmentData {
  rightArmPercent: number | null;
  leftArmPercent: number | null;
  trunkPercent: number | null;
  rightLegPercent: number | null;
  leftLegPercent: number | null;
}

interface HumanBodyModelProps {
  segmentData: SegmentData;
  interactive?: boolean;
  showTooltips?: boolean;
}

// Main component
export function HumanBodyModel({ 
  segmentData, 
  interactive = true, 
  showTooltips = true 
}: HumanBodyModelProps) {
  const [focusedSegment, setFocusedSegment] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [quality, setQuality] = useState<'low' | 'high'>('high');
  const [cameraView, setCameraView] = useState<CameraView>('front');
  const orbitControlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const perfMonitor = useRef(new PerformanceMonitor());

  // Detect device capabilities on mount
  useEffect(() => {
    const capabilities = getDeviceCapabilities();
    if (capabilities.isLowEnd) {
      setQuality('low');
    }
  }, []);

  const handleReset = useCallback(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
    setFocusedSegment(null);
    setHoveredSegment(null);
    setCameraView('front');
  }, []);

  const handleViewChange = useCallback((view: CameraView) => {
    setCameraView(view);
    if (cameraRef.current) {
      const targetPos = CAMERA_PRESETS[view];
      cameraRef.current.position.copy(targetPos);
      cameraRef.current.lookAt(0, 1, 0);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.set(0, 1, 0);
        orbitControlsRef.current.update();
      }
    }
  }, []);

  const handleQualityToggle = useCallback(() => {
    setQuality(prev => prev === 'high' ? 'low' : 'high');
  }, []);

  return (
    <div className="w-full h-[600px] relative rounded-xl overflow-hidden glass-dark border border-white/5">
      <BodyModelErrorBoundary>
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground animate-pulse">Loading 3D Model...</p>
            </div>
          </div>
        }>
          <Canvas
            shadows={quality === 'high'}
            gl={{
              antialias: quality === 'high',
              alpha: true,
              powerPreference: quality === 'high' ? 'high-performance' : 'low-power',
            }}
            dpr={quality === 'high' ? [1, 2] : [1, 1]}
          >
            <PerspectiveCamera 
              ref={cameraRef}
              makeDefault 
              position={CAMERA_PRESETS[cameraView].toArray() as [number, number, number]}
              fov={50}
            />
            
            <OrbitControls 
              ref={orbitControlsRef}
              enablePan={false}
              enableZoom={interactive}
              minDistance={2}
              maxDistance={5}
              maxPolarAngle={Math.PI / 1.5}
              minPolarAngle={Math.PI / 4}
              dampingFactor={0.05}
              rotateSpeed={0.5}
            />

            {/* Environment and lighting */}
            <Body3DEnvironment quality={quality} />

            {/* Enhanced Anatomical 3D Body Model */}
            <AnatomicalBodyModel 
              segmentData={segmentData}
              hoveredSegment={hoveredSegment}
              focusedSegment={focusedSegment}
            />
          </Canvas>
        </Suspense>
      </BodyModelErrorBoundary>
      
      {/* Controls Panel */}
      <Body3DControls
        onReset={handleReset}
        onViewChange={handleViewChange}
        onQualityToggle={handleQualityToggle}
        quality={quality}
      />

      {/* Color Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-primary/20 rounded-xl p-4 text-xs backdrop-blur-xl shadow-2xl">
        <p className="font-bold mb-3 text-primary flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Muscle Mass %
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500/80" />
            <span className="text-muted-foreground">90-110% Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500/80" />
            <span className="text-muted-foreground">80-90% / 110-120%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500/80" />
            <span className="text-muted-foreground">&lt;80% / &gt;120%</span>
          </div>
        </div>
      </div>

      {/* Performance indicator (dev mode) */}
      {import.meta.env.DEV && (
        <div className="absolute top-4 left-4 bg-slate-900/80 border border-border/50 rounded px-2 py-1 text-xs text-muted-foreground">
          Quality: {quality}
        </div>
      )}
    </div>
  );
}
