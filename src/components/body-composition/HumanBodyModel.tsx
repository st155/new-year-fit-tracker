import { Suspense, useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import { getSegmentColor, getSegmentStatus } from '@/lib/inbody-utils';

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
}: { 
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  percent: number | null;
  name: string;
  onHover?: (name: string | null) => void;
  onClick?: (name: string) => void;
  isHovered?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Мемоизация геометрии для производительности
  const geometry = useMemo(() => {
    return new THREE.CapsuleGeometry(args[0], args[1], args[2]);
  }, [args[0], args[1], args[2]]);

  useFrame((state, delta) => {
    // Ограничить frame rate если рендер медленный
    if (delta > 0.033) return; // Skip if frame took > 33ms (30fps)
    
    if (meshRef.current && (isHovered || (percent && (percent < 90 || percent > 110)))) {
      setPulsePhase(state.clock.elapsedTime * 2);
      const scale = 1 + Math.sin(pulsePhase) * 0.05;
      meshRef.current.scale.setScalar(scale);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
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
    if (onClick) onClick(name);
  };

  const emissiveIntensity = isHovered ? 0.8 : 0.5;
  const metalness = isHovered ? 0.9 : 0.8;

  return (
    <group>
      <mesh 
        ref={meshRef}
        position={position} 
        rotation={rotation}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <capsuleGeometry args={args} />
        <meshStandardMaterial
          color={color}
          wireframe
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={metalness}
          roughness={0.2}
        />
      </mesh>
      
      {/* Outline for hovered segment */}
      {isHovered && (
        <mesh position={position} rotation={rotation}>
          <capsuleGeometry args={[args[0] * 1.1, args[1] * 1.05, args[2]]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function Body3DModel({ 
  segmentData, 
  interactive, 
  showTooltips 
}: { 
  segmentData: SegmentData;
  interactive?: boolean;
  showTooltips?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<SegmentTooltipData | null>(null);

  useFrame((state, delta) => {
    // Ограничить frame rate
    if (delta > 0.033) return;
    
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  // Мемоизация сегментов для tooltip
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

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#00D9FF"
          wireframe
          emissive="#00D9FF"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Torso */}
      <BodySegment
        position={[0, 0.8, 0]}
        args={[0.2, 0.8, 16]}
        color={getSegmentColor(segmentData.trunkPercent)}
        percent={segmentData.trunkPercent}
        name="Trunk"
        onHover={handleSegmentHover}
        isHovered={hoveredSegment === 'Trunk'}
      />

      {/* Right Arm */}
      <BodySegment
        position={[0.4, 1.2, 0]}
        args={[0.08, 0.6, 16]}
        rotation={[0, 0, -0.3]}
        color={getSegmentColor(segmentData.rightArmPercent)}
        percent={segmentData.rightArmPercent}
        name="Right Arm"
        onHover={handleSegmentHover}
        isHovered={hoveredSegment === 'Right Arm'}
      />

      {/* Left Arm */}
      <BodySegment
        position={[-0.4, 1.2, 0]}
        args={[0.08, 0.6, 16]}
        rotation={[0, 0, 0.3]}
        color={getSegmentColor(segmentData.leftArmPercent)}
        percent={segmentData.leftArmPercent}
        name="Left Arm"
        onHover={handleSegmentHover}
        isHovered={hoveredSegment === 'Left Arm'}
      />

      {/* Right Leg */}
      <BodySegment
        position={[0.15, -0.2, 0]}
        args={[0.1, 0.8, 16]}
        color={getSegmentColor(segmentData.rightLegPercent)}
        percent={segmentData.rightLegPercent}
        name="Right Leg"
        onHover={handleSegmentHover}
        isHovered={hoveredSegment === 'Right Leg'}
      />

      {/* Left Leg */}
      <BodySegment
        position={[-0.15, -0.2, 0]}
        args={[0.1, 0.8, 16]}
        color={getSegmentColor(segmentData.leftLegPercent)}
        percent={segmentData.leftLegPercent}
        name="Left Leg"
        onHover={handleSegmentHover}
        isHovered={hoveredSegment === 'Left Leg'}
      />

      {/* Tooltip */}
      {tooltipData && tooltipData.percent !== null && (
        <Html position={tooltipData.position} center>
          <div className="bg-slate-900/95 border border-primary/50 rounded-lg p-3 shadow-xl backdrop-blur-sm min-w-[180px]">
            <p className="text-xs font-semibold text-primary mb-1">{tooltipData.name}</p>
            <p className="text-lg font-bold text-white">{tooltipData.percent.toFixed(1)}%</p>
            <p className={`text-xs font-semibold mt-1 ${getSegmentStatus(tooltipData.percent).color}`}>
              {getSegmentStatus(tooltipData.percent).label}
            </p>
          </div>
        </Html>
      )}

      {/* Ambient light */}
      <ambientLight intensity={0.5} />
      <pointLight position={[2, 3, 2]} intensity={1} color="#9333EA" />
      <pointLight position={[-2, 3, -2]} intensity={1} color="#6366F1" />
    </group>
  );
}

export function HumanBodyModel({ 
  segmentData, 
  interactive = true, 
  showTooltips = true 
}: HumanBodyModelProps) {
  return (
    <div className="w-full h-[400px] relative">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading 3D Model...</div>
        </div>
      }>
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 1, 3]} />
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
            minDistance={2}
            maxDistance={5}
          />
          <Body3DModel 
            segmentData={segmentData} 
            interactive={interactive}
            showTooltips={showTooltips}
          />
        </Canvas>
      </Suspense>
      
      {/* Color Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-border/50 rounded-lg p-3 text-xs backdrop-blur-sm">
        <p className="font-semibold mb-2 text-muted-foreground">Muscle Mass %</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#60a5fa' }} />
            <span className="text-muted-foreground">&lt;90% Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00D9FF' }} />
            <span className="text-muted-foreground">90-110% Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9333EA' }} />
            <span className="text-muted-foreground">&gt;110% High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
