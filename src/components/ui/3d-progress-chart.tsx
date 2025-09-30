import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import { useMemo } from 'react';

interface DataPoint {
  date: string;
  value: number;
  change?: number;
}

interface Chart3DProps {
  data: DataPoint[];
  color?: string;
  targetValue?: number;
  height?: string;
}

function DataPoints({ data, color = '#06B6D4', targetValue }: { data: DataPoint[]; color?: string; targetValue?: number }) {
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const maxValue = Math.max(...data.map(d => d.value), targetValue || 0);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;
    
    return data.map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 10 - 5; // Spread along X axis
      const y = ((point.value - minValue) / range) * 8 - 2; // Normalize to 0-8, then shift
      const z = 0;
      
      return { position: [x, y, z] as [number, number, number], value: point.value, date: point.date };
    });
  }, [data, targetValue]);

  const linePoints = useMemo(() => {
    return points.map(p => p.position);
  }, [points]);

  // Target line points
  const targetLinePoints = useMemo(() => {
    if (!targetValue || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value), targetValue);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;
    const y = ((targetValue - minValue) / range) * 8 - 2;
    
    return [
      [-5, y, 0] as [number, number, number],
      [5, y, 0] as [number, number, number]
    ];
  }, [targetValue, data]);

  return (
    <group>
      {/* Data line */}
      {linePoints.length > 1 && (
        <Line
          points={linePoints}
          color={color}
          lineWidth={3}
        />
      )}

      {/* Data points */}
      {points.map((point, index) => (
        <group key={index} position={point.position}>
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
              color={color} 
              emissive={color} 
              emissiveIntensity={0.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          {/* Glow effect */}
          <mesh>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Target line */}
      {targetLinePoints && (
        <Line
          points={targetLinePoints}
          color="#FF6B2C"
          lineWidth={2}
          dashed
          dashScale={50}
          dashSize={0.5}
          gapSize={0.5}
        />
      )}

      {/* Grid helper */}
      <Grid 
        args={[10, 10]} 
        cellSize={1} 
        cellThickness={0.5}
        cellColor="#ffffff"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#ffffff"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid={false}
        position={[0, -2, 0]}
      />
    </group>
  );
}

export function Chart3D({ data, color = '#06B6D4', targetValue, height = '300px' }: Chart3DProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center rounded-2xl border-2"
        style={{
          height,
          background: "rgba(255, 255, 255, 0.03)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <p className="text-muted-foreground text-sm">Нет данных для отображения</p>
      </div>
    );
  }

  return (
    <div 
      className="rounded-2xl border-2 overflow-hidden"
      style={{
        height,
        background: "rgba(255, 255, 255, 0.03)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 10, 50]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={color} />
        <spotLight
          position={[0, 10, 0]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          castShadow
          color="#ffffff"
        />

        {/* Data visualization */}
        <DataPoints data={data} color={color} targetValue={targetValue} />

        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}