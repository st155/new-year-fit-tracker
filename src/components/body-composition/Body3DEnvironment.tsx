/**
 * 3D Environment setup for body model
 * Includes lighting, floor, and background
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface Body3DEnvironmentProps {
  quality?: 'low' | 'medium' | 'high';
}

export function Body3DEnvironment({ quality = 'high' }: Body3DEnvironmentProps) {
  const lightRef = useRef<THREE.PointLight>(null);

  // Subtle light animation
  useFrame((state) => {
    if (lightRef.current && quality !== 'low') {
      lightRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.4} />

      {/* Main lights */}
      <pointLight 
        ref={lightRef}
        position={[2, 3, 2]} 
        intensity={1} 
        color="#06b6d4" 
        distance={10}
        decay={2}
      />
      <pointLight 
        position={[-2, 2, -1]} 
        intensity={0.8} 
        color="#8b5cf6" 
        distance={8}
        decay={2}
      />
      <pointLight 
        position={[0, -1, 2]} 
        intensity={0.5} 
        color="#d946ef" 
        distance={6}
        decay={2}
      />

      {/* Rim light for edge definition */}
      <spotLight
        position={[0, 5, -5]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
        color="#ffffff"
        castShadow={quality === 'high'}
      />

      {/* Environment map for reflections (only on high quality) */}
      {quality === 'high' && (
        <Environment preset="city" />
      )}

      {/* Contact shadows on floor */}
      {quality !== 'low' && (
        <ContactShadows
          position={[0, -1.2, 0]}
          opacity={0.4}
          scale={3}
          blur={2}
          far={2}
        />
      )}

      {/* Reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial
          color="#0a0a0a"
          roughness={0.1}
          metalness={0.8}
          envMapIntensity={1}
        />
      </mesh>

      {/* Background gradient */}
      <mesh position={[0, 0, -5]} scale={[20, 20, 1]}>
        <planeGeometry />
        <meshBasicMaterial>
          <primitive
            attach="map"
            object={(() => {
              const canvas = document.createElement('canvas');
              canvas.width = 256;
              canvas.height = 256;
              const ctx = canvas.getContext('2d')!;
              const gradient = ctx.createLinearGradient(0, 0, 0, 256);
              gradient.addColorStop(0, '#0a0a0a');
              gradient.addColorStop(0.5, '#1a1a2e');
              gradient.addColorStop(1, '#0a0a0a');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, 256, 256);
              return new THREE.CanvasTexture(canvas);
            })()}
          />
        </meshBasicMaterial>
      </mesh>
    </>
  );
}
