/**
 * Three.js utilities for 3D body model
 */

import * as THREE from 'three';

/**
 * Check device capabilities for adaptive quality
 */
export function getDeviceCapabilities() {
  const gl = document.createElement('canvas').getContext('webgl');
  if (!gl) return { isLowEnd: true, maxTextureSize: 512 };

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  
  // Detect low-end devices
  const isLowEnd = 
    /Mali|Adreno [1-4]|PowerVR|Intel HD [2-5]/.test(renderer) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);

  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  return {
    isLowEnd,
    maxTextureSize,
    renderer,
  };
}

/**
 * Camera preset positions
 */
export const CAMERA_PRESETS = {
  front: new THREE.Vector3(0, 1, 3),
  back: new THREE.Vector3(0, 1, -3),
  left: new THREE.Vector3(-3, 1, 0),
  right: new THREE.Vector3(3, 1, 0),
  top: new THREE.Vector3(0, 4, 0),
} as const;

export type CameraView = keyof typeof CAMERA_PRESETS;

/**
 * Animate camera to target position
 */
export function animateCameraToPosition(
  camera: THREE.Camera,
  targetPosition: THREE.Vector3,
  duration: number = 1000
): Promise<void> {
  return new Promise((resolve) => {
    const startPosition = camera.position.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      camera.position.lerpVectors(startPosition, targetPosition, eased);
      camera.lookAt(0, 1, 0);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    animate();
  });
}

/**
 * Create PBR material with glass effect
 */
export function createGlassMaterial(color: string, opacity: number = 0.6) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.3,
    thickness: 0.5,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  });
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;

  update(): number {
    this.frameCount++;
    const now = performance.now();
    
    if (now >= this.lastTime + 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
    }

    return this.fps;
  }

  shouldReduceQuality(): boolean {
    return this.fps < 30;
  }

  shouldIncreaseQuality(): boolean {
    return this.fps > 55;
  }
}
