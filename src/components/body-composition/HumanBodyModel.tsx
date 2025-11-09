import { Suspense, useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { getSegmentColor, getSegmentStatus } from '@/lib/inbody-utils';
import { Body3DEnvironment } from './Body3DEnvironment';
import { Body3DControls } from './Body3DControls';
import { 
  createGlassMaterial, 
  CAMERA_PRESETS, 
  CameraView, 
  getDeviceCapabilities,
  PerformanceMonitor
} from '@/lib/three-utils';

interface SegmentData {
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

interface SegmentTooltipData {
  name: string;
  percent: number | null;
  position: [number, number, number];
}

function BodySegment({ 
  position, 
  args, 
  rotation = [0, 0, 0],
  color,
  percent,
  name,
  onHover,
  onClick,
  isHovered,
  isFocused,
  quality,
}: { 
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  percent: number | null;
  name: string;
  onHover?: (name: string | null) => void;
  onClick?: (name: string, position: [number, number, number]) => void;
  isHovered?: boolean;
  isFocused?: boolean;
  quality: 'low' | 'high';
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Мемоизация геометрии и материала
  const geometry = useMemo(() => {
    return new THREE.CapsuleGeometry(args[0], args[1], args[2]);
  }, [args[0], args[1], args[2]]);

  const material = useMemo(() => {
    if (quality === 'low') {
      // Simple wireframe for low-end devices
      return new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
      });
    }
    // PBR glass material for high quality
    return createGlassMaterial(color, isHovered ? 0.8 : 0.6);
  }, [color, isHovered, quality]);

  useFrame((state, delta) => {
    if (delta > 0.033) return; // Skip if frame took > 33ms
    
    if (meshRef.current) {
      // Pulse animation for hovered or abnormal segments
      if (isHovered || isFocused || (percent && (percent < 90 || percent > 110))) {
        setPulsePhase(state.clock.elapsedTime * 2);
        const scale = 1 + Math.sin(pulsePhase) * (isHovered ? 0.08 : 0.03);
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.setScalar(1);
      }

      // Gentle glow effect
      if (quality === 'high' && material instanceof THREE.MeshPhysicalMaterial) {
        material.emissiveIntensity = isHovered ? 0.3 : 0.1;
      }
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onHover) onHover(name);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    if (onHover) onHover(null);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (onClick) onClick(name, position);
  };

  return (
    <group>
      <mesh 
        ref={meshRef}
        position={position} 
        rotation={rotation}
        geometry={geometry}
        material={material}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      
      {/* Outline for hovered/focused segment */}
      {(isHovered || isFocused) && quality === 'high' && (
        <mesh position={position} rotation={rotation}>
          <capsuleGeometry args={[args[0] * 1.15, args[1] * 1.05, args[2]]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={isFocused ? 0.4 : 0.2} 
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

function Body3DModel({ 
  segmentData, 
  interactive, 
  showTooltips,
  focusedSegment,
  quality,
}: { 
  segmentData: SegmentData;
  interactive?: boolean;
  showTooltips?: boolean;
  focusedSegment: string | null;
  quality: 'low' | 'high';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<SegmentTooltipData | null>(null);

  // Breathing animation for trunk
  useFrame((state, delta) => {
    if (delta > 0.033) return;
    
    if (groupRef.current && quality === 'high') {
      // Subtle idle rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
      
      // Breathing effect - slight scale change
      const breathScale = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.015;
      groupRef.current.scale.y = breathScale;
    }
  });

  const segmentMap = useMemo(() => ({
    'Right Arm': { percent: segmentData.rightArmPercent, position: [0.4, 1.2, 0] as [number, number, number] },
    'Left Arm': { percent: segmentData.leftArmPercent, position: [-0.4, 1.2, 0] as [number, number, number] },
    'Trunk': { percent: segmentData.trunkPercent, position: [0, 0.8, 0] as [number, number, number] },
    'Right Leg': { percent: segmentData.rightLegPercent, position: [0.15, -0.2, 0] as [number, number, number] },
    'Left Leg': { percent: segmentData.leftLegPercent, position: [-0.15, -0.2, 0] as [number, number, number] },
  }), [segmentData]);

  const handleSegmentHover = useCallback((name: string | null) => {
    if (!interactive) return;
    
    setHoveredSegment(name);
    
    if (name && showTooltips) {
      const segment = segmentMap[name as keyof typeof segmentMap];
      if (segment) {
        setTooltipData({
          name,
          percent: segment.percent,
          position: segment.position,
        });
      }
    } else {
      setTooltipData(null);
    }
  }, [interactive, showTooltips, segmentMap]);

  const handleSegmentClick = useCallback((name: string, position: [number, number, number]) => {
    console.log('Segment clicked:', name, position);
    // Click handled by parent for focus
  }, []);

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        {quality === 'high' ? (
          <meshPhysicalMaterial
            {...createGlassMaterial('#06b6d4', 0.7)}
          />
        ) : (
          <meshBasicMaterial color="#06b6d4" wireframe />
        )}
      </mesh>

      {/* Body Segments */}
      <BodySegment
        position={[0, 0.8, 0]}
        args={[0.2, 0.8, 16]}
        color={getSegmentColor(segmentData.trunkPercent)}
        percent={segmentData.trunkPercent}
        name="Trunk"
        onHover={handleSegmentHover}
        onClick={handleSegmentClick}
        isHovered={hoveredSegment === 'Trunk'}
        isFocused={focusedSegment === 'Trunk'}
        quality={quality}
      />

      <BodySegment
        position={[0.4, 1.2, 0]}
        args={[0.08, 0.6, 16]}
        rotation={[0, 0, -0.3]}
        color={getSegmentColor(segmentData.rightArmPercent)}
        percent={segmentData.rightArmPercent}
        name="Right Arm"
        onHover={handleSegmentHover}
        onClick={handleSegmentClick}
        isHovered={hoveredSegment === 'Right Arm'}
        isFocused={focusedSegment === 'Right Arm'}
        quality={quality}
      />

      <BodySegment
        position={[-0.4, 1.2, 0]}
        args={[0.08, 0.6, 16]}
        rotation={[0, 0, 0.3]}
        color={getSegmentColor(segmentData.leftArmPercent)}
        percent={segmentData.leftArmPercent}
        name="Left Arm"
        onHover={handleSegmentHover}
        onClick={handleSegmentClick}
        isHovered={hoveredSegment === 'Left Arm'}
        isFocused={focusedSegment === 'Left Arm'}
        quality={quality}
      />

      <BodySegment
        position={[0.15, -0.2, 0]}
        args={[0.1, 0.8, 16]}
        color={getSegmentColor(segmentData.rightLegPercent)}
        percent={segmentData.rightLegPercent}
        name="Right Leg"
        onHover={handleSegmentHover}
        onClick={handleSegmentClick}
        isHovered={hoveredSegment === 'Right Leg'}
        isFocused={focusedSegment === 'Right Leg'}
        quality={quality}
      />

      <BodySegment
        position={[-0.15, -0.2, 0]}
        args={[0.1, 0.8, 16]}
        color={getSegmentColor(segmentData.leftLegPercent)}
        percent={segmentData.leftLegPercent}
        name="Left Leg"
        onHover={handleSegmentHover}
        onClick={handleSegmentClick}
        isHovered={hoveredSegment === 'Left Leg'}
        isFocused={focusedSegment === 'Left Leg'}
        quality={quality}
      />

      {/* Enhanced Tooltip */}
      {tooltipData && tooltipData.percent !== null && (
        <Html position={tooltipData.position} center>
          <div className="bg-slate-900/95 border-2 border-primary/50 rounded-xl p-4 shadow-2xl backdrop-blur-md min-w-[200px] animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-primary">{tooltipData.name}</p>
              <div className={`w-3 h-3 rounded-full ${
                tooltipData.percent < 90 ? 'bg-blue-400' :
                tooltipData.percent > 110 ? 'bg-purple-500' :
                'bg-cyan-400'
              }`} />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {tooltipData.percent.toFixed(1)}%
            </p>
            <div className={`text-xs font-semibold px-2 py-1 rounded ${
              getSegmentStatus(tooltipData.percent).color
            }`}>
              {getSegmentStatus(tooltipData.percent).label}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function HumanBodyModel({ 
  segmentData, 
  interactive = true, 
  showTooltips = true 
}: HumanBodyModelProps) {
  const [focusedSegment, setFocusedSegment] = useState<string | null>(null);
  const [quality, setQuality] = useState<'low' | 'high'>('high');
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
  }, []);

  const handleViewChange = useCallback((view: CameraView) => {
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
    <div className="w-full h-[500px] relative rounded-xl overflow-hidden">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading 3D Model...</p>
          </div>
        </div>
      }>
        <Canvas shadows={quality === 'high'}>
          <PerspectiveCamera 
            ref={cameraRef}
            makeDefault 
            position={[0, 1, 3]} 
            fov={50}
          />
          
          <OrbitControls 
            ref={orbitControlsRef}
            enableZoom={true}
            enablePan={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.3}
            minDistance={1.5}
            maxDistance={6}
            dampingFactor={0.05}
            enableDamping
          />

          <Body3DEnvironment quality={quality} />
          
          <Body3DModel 
            segmentData={segmentData} 
            interactive={interactive}
            showTooltips={showTooltips}
            focusedSegment={focusedSegment}
            quality={quality}
          />

          {/* Bloom effect for high quality */}
          {quality === 'high' && (
            <Suspense fallback={null}>
              <EffectComposer>
                <Bloom 
                  luminanceThreshold={0.2}
                  luminanceSmoothing={0.9}
                  intensity={0.5}
                />
              </EffectComposer>
            </Suspense>
          )}
        </Canvas>
      </Suspense>
      
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
            <div className="w-4 h-4 rounded-full border-2 border-blue-400 bg-blue-400/20" />
            <span className="text-muted-foreground">&lt;90% Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-cyan-400 bg-cyan-400/20" />
            <span className="text-muted-foreground">90-110% Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-purple-500 bg-purple-500/20" />
            <span className="text-muted-foreground">&gt;110% High</span>
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
