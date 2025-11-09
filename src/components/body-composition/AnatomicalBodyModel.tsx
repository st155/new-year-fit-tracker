import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SegmentData {
  rightArmPercent: number | null;
  leftArmPercent: number | null;
  trunkPercent: number | null;
  rightLegPercent: number | null;
  leftLegPercent: number | null;
}

interface AnatomicalBodyModelProps {
  segmentData: SegmentData;
  hoveredSegment?: string | null;
  focusedSegment?: string | null;
}

// Enhanced color calculation with smooth transitions
function getSegmentColor(percent: number | null): string {
  if (percent === null) return '#6b7280';
  
  // Color spectrum: red (low) -> yellow (normal) -> green (high)
  if (percent < 80) return '#ef4444'; // red-500
  if (percent < 90) return '#f59e0b'; // amber-500
  if (percent < 110) return '#10b981'; // emerald-500
  if (percent < 120) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

function createBodySegmentMaterial(color: string, isHovered: boolean, isFocused: boolean) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.3,
    metalness: 0.2,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    emissive: new THREE.Color(color),
    emissiveIntensity: isFocused ? 0.6 : isHovered ? 0.4 : 0.2,
    transparent: true,
    opacity: isFocused ? 1 : isHovered ? 0.95 : 0.9,
  });
}

export function AnatomicalBodyModel({ 
  segmentData, 
  hoveredSegment,
  focusedSegment 
}: AnatomicalBodyModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create anatomical body parts with proper proportions
  const bodyParts = useMemo(() => {
    interface BodyPart {
      geometry: THREE.BufferGeometry;
      position: [number, number, number];
      rotation?: [number, number, number];
      segment?: string;
      color?: string;
    }
    
    const parts: Record<string, BodyPart> = {
      // Head
      head: {
        geometry: new THREE.SphereGeometry(0.15, 32, 32),
        position: [0, 1.7, 0] as [number, number, number],
        color: '#8b7355',
      },
      // Neck
      neck: {
        geometry: new THREE.CylinderGeometry(0.08, 0.1, 0.15, 16),
        position: [0, 1.475, 0] as [number, number, number],
        color: '#8b7355',
      },
      // Torso (trunk) - more anatomical shape
      upperTorso: {
        geometry: new THREE.CylinderGeometry(0.2, 0.25, 0.4, 16),
        position: [0, 1.3, 0] as [number, number, number],
        segment: 'trunk',
      },
      lowerTorso: {
        geometry: new THREE.CylinderGeometry(0.25, 0.22, 0.35, 16),
        position: [0, 0.925, 0] as [number, number, number],
        segment: 'trunk',
      },
      // Right Arm
      rightShoulder: {
        geometry: new THREE.SphereGeometry(0.09, 16, 16),
        position: [0.29, 1.4, 0] as [number, number, number],
        segment: 'right arm',
      },
      rightUpperArm: {
        geometry: new THREE.CylinderGeometry(0.075, 0.065, 0.35, 12),
        position: [0.42, 1.15, 0] as [number, number, number],
        rotation: [0, 0, Math.PI / 12] as [number, number, number],
        segment: 'right arm',
      },
      rightElbow: {
        geometry: new THREE.SphereGeometry(0.06, 12, 12),
        position: [0.52, 0.95, 0] as [number, number, number],
        segment: 'right arm',
      },
      rightForearm: {
        geometry: new THREE.CylinderGeometry(0.06, 0.055, 0.35, 12),
        position: [0.62, 0.75, 0] as [number, number, number],
        rotation: [0, 0, Math.PI / 12] as [number, number, number],
        segment: 'right arm',
      },
      rightHand: {
        geometry: new THREE.SphereGeometry(0.055, 12, 12),
        position: [0.72, 0.55, 0] as [number, number, number],
        segment: 'right arm',
      },
      // Left Arm (mirrored)
      leftShoulder: {
        geometry: new THREE.SphereGeometry(0.09, 16, 16),
        position: [-0.29, 1.4, 0] as [number, number, number],
        segment: 'left arm',
      },
      leftUpperArm: {
        geometry: new THREE.CylinderGeometry(0.075, 0.065, 0.35, 12),
        position: [-0.42, 1.15, 0] as [number, number, number],
        rotation: [0, 0, -Math.PI / 12] as [number, number, number],
        segment: 'left arm',
      },
      leftElbow: {
        geometry: new THREE.SphereGeometry(0.06, 12, 12),
        position: [-0.52, 0.95, 0] as [number, number, number],
        segment: 'left arm',
      },
      leftForearm: {
        geometry: new THREE.CylinderGeometry(0.06, 0.055, 0.35, 12),
        position: [-0.62, 0.75, 0] as [number, number, number],
        rotation: [0, 0, -Math.PI / 12] as [number, number, number],
        segment: 'left arm',
      },
      leftHand: {
        geometry: new THREE.SphereGeometry(0.055, 12, 12),
        position: [-0.72, 0.55, 0] as [number, number, number],
        segment: 'left arm',
      },
      // Right Leg
      rightHip: {
        geometry: new THREE.SphereGeometry(0.11, 16, 16),
        position: [0.12, 0.7, 0] as [number, number, number],
        segment: 'right leg',
      },
      rightThigh: {
        geometry: new THREE.CylinderGeometry(0.1, 0.08, 0.5, 16),
        position: [0.12, 0.4, 0] as [number, number, number],
        segment: 'right leg',
      },
      rightKnee: {
        geometry: new THREE.SphereGeometry(0.075, 14, 14),
        position: [0.12, 0.12, 0] as [number, number, number],
        segment: 'right leg',
      },
      rightCalf: {
        geometry: new THREE.CylinderGeometry(0.075, 0.06, 0.45, 14),
        position: [0.12, -0.15, 0] as [number, number, number],
        segment: 'right leg',
      },
      rightFoot: {
        geometry: new THREE.BoxGeometry(0.08, 0.06, 0.15),
        position: [0.12, -0.4, 0.035] as [number, number, number],
        segment: 'right leg',
      },
      // Left Leg (mirrored)
      leftHip: {
        geometry: new THREE.SphereGeometry(0.11, 16, 16),
        position: [-0.12, 0.7, 0] as [number, number, number],
        segment: 'left leg',
      },
      leftThigh: {
        geometry: new THREE.CylinderGeometry(0.1, 0.08, 0.5, 16),
        position: [-0.12, 0.4, 0] as [number, number, number],
        segment: 'left leg',
      },
      leftKnee: {
        geometry: new THREE.SphereGeometry(0.075, 14, 14),
        position: [-0.12, 0.12, 0] as [number, number, number],
        segment: 'left leg',
      },
      leftCalf: {
        geometry: new THREE.CylinderGeometry(0.075, 0.06, 0.45, 14),
        position: [-0.12, -0.15, 0] as [number, number, number],
        segment: 'left leg',
      },
      leftFoot: {
        geometry: new THREE.BoxGeometry(0.08, 0.06, 0.15),
        position: [-0.12, -0.4, 0.035] as [number, number, number],
        segment: 'left leg',
      },
    };

    return parts;
  }, []);

  // Idle animation
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle breathing animation
      const breathe = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
      groupRef.current.scale.y = 1 + breathe * 0.5;
      
      // Subtle rotation
      if (!hoveredSegment && !focusedSegment) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
      }
    }
  });

  // Get color for segment
  const getColor = (segment?: string) => {
    if (!segment) return '#8b7355'; // Skin color for head/neck
    
    const segmentKey = segment.toLowerCase().replace(' ', '');
    switch (segmentKey) {
      case 'rightarm':
        return getSegmentColor(segmentData.rightArmPercent);
      case 'leftarm':
        return getSegmentColor(segmentData.leftArmPercent);
      case 'trunk':
        return getSegmentColor(segmentData.trunkPercent);
      case 'rightleg':
        return getSegmentColor(segmentData.rightLegPercent);
      case 'leftleg':
        return getSegmentColor(segmentData.leftLegPercent);
      default:
        return '#6b7280';
    }
  };

  return (
    <group ref={groupRef} position={[0, 0.4, 0]}>
      {Object.entries(bodyParts).map(([key, part]) => {
        const isHovered = hoveredSegment === part.segment;
        const isFocused = focusedSegment === part.segment;
        const color = part.color || getColor(part.segment);
        
        return (
          <mesh
            key={key}
            geometry={part.geometry}
            material={createBodySegmentMaterial(color, isHovered, isFocused)}
            position={part.position}
            rotation={part.rotation}
            castShadow
            receiveShadow
          />
        );
      })}
      
      {/* Ground shadow plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]} receiveShadow>
        <planeGeometry args={[3, 3]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </group>
  );
}
