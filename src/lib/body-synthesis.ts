/**
 * Body Synthesis Algorithms
 * Generates synthetic segmental body composition data when InBody scans are unavailable
 */

export interface SegmentalData {
  rightArm: {
    percent: number;
    mass: number;
  };
  leftArm: {
    percent: number;
    mass: number;
  };
  trunk: {
    percent: number;
    mass: number;
  };
  rightLeg: {
    percent: number;
    mass: number;
  };
  leftLeg: {
    percent: number;
    mass: number;
  };
}

/**
 * Standard proportions based on gender and body composition research
 */
const STANDARD_PROPORTIONS = {
  male: {
    rightArm: 5.5,
    leftArm: 5.5,
    trunk: 43.0,
    rightLeg: 23.0,
    leftLeg: 23.0,
  },
  female: {
    rightArm: 4.8,
    leftArm: 4.8,
    trunk: 41.0,
    rightLeg: 24.7,
    leftLeg: 24.7,
  },
};

/**
 * Synthesize segmental muscle mass distribution from overall metrics
 */
export function synthesizeSegmentalData(
  weight: number,
  bodyFatPercent: number,
  muscleMass?: number,
  gender: 'male' | 'female' = 'male'
): SegmentalData {
  // Calculate muscle mass if not provided
  const leanBodyMass = weight * (1 - bodyFatPercent / 100);
  const estimatedMuscleMass = muscleMass || leanBodyMass * 0.45; // ~45% of LBM is skeletal muscle

  // Get base proportions
  const baseProps = STANDARD_PROPORTIONS[gender];

  // Adjust proportions based on body fat percentage
  // Higher body fat = more trunk mass, less extremities
  const fatAdjustment = (bodyFatPercent - 15) / 100; // baseline 15%
  
  const adjustedProps = {
    rightArm: Math.max(3, baseProps.rightArm - fatAdjustment * 1.2),
    leftArm: Math.max(3, baseProps.leftArm - fatAdjustment * 1.2),
    trunk: Math.min(55, baseProps.trunk + fatAdjustment * 6),
    rightLeg: Math.max(18, baseProps.rightLeg - fatAdjustment * 1.8),
    leftLeg: Math.max(18, baseProps.leftLeg - fatAdjustment * 1.8),
  };

  // Normalize to 100%
  const total = Object.values(adjustedProps).reduce((sum, val) => sum + val, 0);
  const normalizedProps = Object.entries(adjustedProps).reduce((acc, [key, val]) => {
    acc[key as keyof typeof adjustedProps] = (val / total) * 100;
    return acc;
  }, {} as typeof adjustedProps);

  // Calculate mass for each segment
  return {
    rightArm: {
      percent: normalizedProps.rightArm,
      mass: (estimatedMuscleMass * normalizedProps.rightArm) / 100,
    },
    leftArm: {
      percent: normalizedProps.leftArm,
      mass: (estimatedMuscleMass * normalizedProps.leftArm) / 100,
    },
    trunk: {
      percent: normalizedProps.trunk,
      mass: (estimatedMuscleMass * normalizedProps.trunk) / 100,
    },
    rightLeg: {
      percent: normalizedProps.rightLeg,
      mass: (estimatedMuscleMass * normalizedProps.rightLeg) / 100,
    },
    leftLeg: {
      percent: normalizedProps.leftLeg,
      mass: (estimatedMuscleMass * normalizedProps.leftLeg) / 100,
    },
  };
}

/**
 * Calculate symmetry score (0-100) comparing left and right sides
 */
export function calculateSymmetryScore(
  leftArmPercent: number,
  rightArmPercent: number,
  leftLegPercent: number,
  rightLegPercent: number
): number {
  const armDiff = Math.abs(leftArmPercent - rightArmPercent);
  const legDiff = Math.abs(leftLegPercent - rightLegPercent);
  
  // Perfect symmetry = 100, each 1% difference reduces score by ~2 points
  const armScore = Math.max(0, 100 - armDiff * 2);
  const legScore = Math.max(0, 100 - legDiff * 2);
  
  return (armScore + legScore) / 2;
}

/**
 * Estimate visceral fat from body fat percentage and weight
 */
export function estimateVisceralFat(
  bodyFatPercent: number,
  weight: number,
  age?: number
): number {
  // Base estimation from body fat %
  let visceralFat = 0;
  
  if (bodyFatPercent < 15) {
    visceralFat = 50;
  } else if (bodyFatPercent < 25) {
    visceralFat = 50 + (bodyFatPercent - 15) * 5;
  } else {
    visceralFat = 100 + (bodyFatPercent - 25) * 10;
  }
  
  // Age adjustment (visceral fat increases with age)
  if (age && age > 30) {
    visceralFat += (age - 30) * 0.5;
  }
  
  return Math.min(200, visceralFat);
}

/**
 * Get recommendation based on segment analysis
 */
export function getSegmentRecommendation(
  percent: number,
  segmentName: string
): string {
  if (percent < 90) {
    return `${segmentName} shows below-average muscle mass. Focus on strength training for this area.`;
  } else if (percent > 110) {
    return `${segmentName} shows above-average development. Maintain current training.`;
  } else {
    return `${segmentName} is within normal range. Continue balanced training.`;
  }
}

/**
 * Interpolate between two data points for timeline
 */
export function interpolateBodyData(
  startData: SegmentalData,
  endData: SegmentalData,
  progress: number // 0 to 1
): SegmentalData {
  const interpolate = (start: number, end: number) => 
    start + (end - start) * progress;

  return {
    rightArm: {
      percent: interpolate(startData.rightArm.percent, endData.rightArm.percent),
      mass: interpolate(startData.rightArm.mass, endData.rightArm.mass),
    },
    leftArm: {
      percent: interpolate(startData.leftArm.percent, endData.leftArm.percent),
      mass: interpolate(startData.leftArm.mass, endData.leftArm.mass),
    },
    trunk: {
      percent: interpolate(startData.trunk.percent, endData.trunk.percent),
      mass: interpolate(startData.trunk.mass, endData.trunk.mass),
    },
    rightLeg: {
      percent: interpolate(startData.rightLeg.percent, endData.rightLeg.percent),
      mass: interpolate(startData.rightLeg.mass, endData.rightLeg.mass),
    },
    leftLeg: {
      percent: interpolate(startData.leftLeg.percent, endData.leftLeg.percent),
      mass: interpolate(startData.leftLeg.mass, endData.leftLeg.mass),
    },
  };
}
