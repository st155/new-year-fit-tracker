import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/page-loader';

interface SegmentData {
  name: string;
  value: number;
  balanced?: boolean;
}

interface BodyModel3DProps {
  segmentalData: SegmentData[];
}

function BodyMesh({ segmentalData }: { segmentalData: SegmentData[] }) {
  const getSegment = (name: string) => 
    segmentalData.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
  
  const getColor = (segment: SegmentData | undefined) => 
    segment?.balanced ? '#10b981' : '#6b7280';
  
  const getEmissive = (segment: SegmentData | undefined) => 
    segment?.balanced ? '#10b981' : '#000000';

  return (
    <group>
      {/* Torso */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.8, 1.2, 0.4]} />
        <meshStandardMaterial 
          color={getColor(getSegment('trunk'))}
          emissive={getEmissive(getSegment('trunk'))}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.6, 1, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8]} />
        <meshStandardMaterial 
          color={getColor(getSegment('right arm'))}
          emissive={getEmissive(getSegment('right arm'))}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.6, 1, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8]} />
        <meshStandardMaterial 
          color={getColor(getSegment('left arm'))}
          emissive={getEmissive(getSegment('left arm'))}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.25, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1]} />
        <meshStandardMaterial 
          color={getColor(getSegment('right leg'))}
          emissive={getEmissive(getSegment('right leg'))}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.25, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1]} />
        <meshStandardMaterial 
          color={getColor(getSegment('left leg'))}
          emissive={getEmissive(getSegment('left leg'))}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

export function BodyModel3D({ segmentalData }: BodyModel3DProps) {
  if (!segmentalData || segmentalData.length === 0) {
    return (
      <div className="h-[500px] glass-medium rounded-lg border border-white/10 flex items-center justify-center">
        <p className="text-muted-foreground">No segmental data available</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] glass-medium rounded-lg border border-white/10">
      <Suspense fallback={<PageLoader message="Loading 3D model..." />}>
        <Canvas>
          <PerspectiveCamera makeDefault position={[3, 2, 3]} />
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            autoRotate
            autoRotateSpeed={2}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[-5, 5, -5]} intensity={0.3} color="#00ffff" />
          <BodyMesh segmentalData={segmentalData} />
        </Canvas>
      </Suspense>
    </div>
  );
}
