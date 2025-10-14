import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { getSegmentColor } from '@/lib/inbody-utils';

interface SegmentData {
  rightArmPercent: number | null;
  leftArmPercent: number | null;
  trunkPercent: number | null;
  rightLegPercent: number | null;
  leftLegPercent: number | null;
}

interface HumanBodyModelProps {
  segmentData: SegmentData;
}

function BodySegment({ 
  position, 
  args, 
  rotation = [0, 0, 0],
  color 
}: { 
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <capsuleGeometry args={args} />
      <meshStandardMaterial
        color={color}
        wireframe
        emissive={color}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

function Body3DModel({ segmentData }: { segmentData: SegmentData }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

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
      />

      {/* Right Arm */}
      <BodySegment
        position={[0.4, 1.2, 0]}
        args={[0.08, 0.6, 16]}
        rotation={[0, 0, -0.3]}
        color={getSegmentColor(segmentData.rightArmPercent)}
      />

      {/* Left Arm */}
      <BodySegment
        position={[-0.4, 1.2, 0]}
        args={[0.08, 0.6, 16]}
        rotation={[0, 0, 0.3]}
        color={getSegmentColor(segmentData.leftArmPercent)}
      />

      {/* Right Leg */}
      <BodySegment
        position={[0.15, -0.2, 0]}
        args={[0.1, 0.8, 16]}
        color={getSegmentColor(segmentData.rightLegPercent)}
      />

      {/* Left Leg */}
      <BodySegment
        position={[-0.15, -0.2, 0]}
        args={[0.1, 0.8, 16]}
        color={getSegmentColor(segmentData.leftLegPercent)}
      />

      {/* Ambient light */}
      <ambientLight intensity={0.5} />
      <pointLight position={[2, 3, 2]} intensity={1} color="#9333EA" />
      <pointLight position={[-2, 3, -2]} intensity={1} color="#6366F1" />
    </group>
  );
}

export function HumanBodyModel({ segmentData }: HumanBodyModelProps) {
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
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />
          <Body3DModel segmentData={segmentData} />
        </Canvas>
      </Suspense>
    </div>
  );
}
