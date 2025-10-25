import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInBodyAnalyses } from '@/hooks/useInBodyAnalyses';
import { useLatestMetrics } from '@/hooks/metrics';
import { synthesizeSegmentalData, type SegmentalData } from '@/lib/body-synthesis';
import { differenceInDays } from 'date-fns';

export type DataSource = 'inbody' | 'synthesized' | 'none';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

interface SegmentalMetrics {
  source: DataSource;
  data: {
    rightArmPercent: number | null;
    leftArmPercent: number | null;
    trunkPercent: number | null;
    rightLegPercent: number | null;
    leftLegPercent: number | null;
    rightArmMass?: number;
    leftArmMass?: number;
    trunkMass?: number;
    rightLegMass?: number;
    leftLegMass?: number;
  };
  lastUpdated: Date | null;
  confidence: ConfidenceLevel;
}

interface OverallMetrics {
  weight: { value: number | null; source: string; date: Date | null };
  bodyFat: { value: number | null; source: string; date: Date | null };
  muscleMass: { value: number | null; source: string; date: Date | null };
  visceralFat: { value: number | null; source: string; date: Date | null };
}

interface EnhancedBodyModelData {
  segmental: SegmentalMetrics;
  overall: OverallMetrics;
  confidence: ConfidenceLevel;
  lastInBodyDate: Date | null;
  hasSufficientData: boolean;
}

export function useEnhancedBodyModel(userId?: string, targetDate?: Date): EnhancedBodyModelData {
  const { user } = useAuth();
  const actualUserId = userId || user?.id;
  
  const { data: inbodyAnalyses = [], isLoading: inbodyLoading } = useInBodyAnalyses(actualUserId);
  const { metrics: unifiedMetrics, loading: unifiedLoading } = useLatestMetrics(actualUserId);

  const enhancedData = useMemo(() => {
    // Default empty state
    const defaultData: EnhancedBodyModelData = {
      segmental: {
        source: 'none',
        data: {
          rightArmPercent: null,
          leftArmPercent: null,
          trunkPercent: null,
          rightLegPercent: null,
          leftLegPercent: null,
        },
        lastUpdated: null,
        confidence: 'low',
      },
      overall: {
        weight: { value: null, source: 'none', date: null },
        bodyFat: { value: null, source: 'none', date: null },
        muscleMass: { value: null, source: 'none', date: null },
        visceralFat: { value: null, source: 'none', date: null },
      },
      confidence: 'low',
      lastInBodyDate: null,
      hasSufficientData: false,
    };

    if (inbodyLoading || unifiedLoading) return defaultData;

    // Get latest InBody scan
    const latestInBody = inbodyAnalyses[0];
    const lastInBodyDate = latestInBody ? new Date(latestInBody.test_date) : null;

    // Extract overall metrics from unified metrics
    const weight = unifiedMetrics['Weight'] || null;
    const bodyFatMetric = unifiedMetrics['Body Fat Percentage'] || null;
    const muscleMassMetric = unifiedMetrics['Muscle Mass'] || null;

    const overall: OverallMetrics = {
      weight: {
        value: weight?.value || latestInBody?.weight || null,
        source: weight?.source || (latestInBody ? 'InBody' : 'none'),
        date: weight?.measurement_date ? new Date(weight.measurement_date) : lastInBodyDate,
      },
      bodyFat: {
        value: bodyFatMetric?.value || latestInBody?.percent_body_fat || null,
        source: bodyFatMetric?.source || (latestInBody ? 'InBody' : 'none'),
        date: bodyFatMetric?.measurement_date ? new Date(bodyFatMetric.measurement_date) : lastInBodyDate,
      },
      muscleMass: {
        value: muscleMassMetric?.value || latestInBody?.skeletal_muscle_mass || null,
        source: muscleMassMetric?.source || (latestInBody ? 'InBody' : 'none'),
        date: muscleMassMetric?.measurement_date ? new Date(muscleMassMetric.measurement_date) : lastInBodyDate,
      },
      visceralFat: {
        value: latestInBody?.visceral_fat_area || null,
        source: latestInBody ? 'InBody' : 'none',
        date: lastInBodyDate,
      },
    };

    // Determine segmental data source
    let segmental: SegmentalMetrics;
    let confidence: ConfidenceLevel = 'low';

    // Priority 1: Use InBody if available and recent (<30 days)
    if (latestInBody && lastInBodyDate) {
      const daysSinceInBody = differenceInDays(new Date(), lastInBodyDate);
      
      if (daysSinceInBody <= 30) {
        // Fresh InBody data - high confidence
        segmental = {
          source: 'inbody',
          data: {
            rightArmPercent: latestInBody.right_arm_percent,
            leftArmPercent: latestInBody.left_arm_percent,
            trunkPercent: latestInBody.trunk_percent,
            rightLegPercent: latestInBody.right_leg_percent,
            leftLegPercent: latestInBody.left_leg_percent,
          },
          lastUpdated: lastInBodyDate,
          confidence: 'high',
        };
        confidence = 'high';
      } else {
        // Old InBody - use for proportions but synthesize based on current weight
        const currentWeight = overall.weight.value;
        const currentBodyFat = overall.bodyFat.value;
        
        if (currentWeight && currentBodyFat) {
          const synthesized = synthesizeSegmentalData(
            currentWeight,
            currentBodyFat,
            overall.muscleMass.value || undefined
          );
          
          segmental = {
            source: 'synthesized',
            data: {
              rightArmPercent: synthesized.rightArm.percent,
              leftArmPercent: synthesized.leftArm.percent,
              trunkPercent: synthesized.trunk.percent,
              rightLegPercent: synthesized.rightLeg.percent,
              leftLegPercent: synthesized.leftLeg.percent,
              rightArmMass: synthesized.rightArm.mass,
              leftArmMass: synthesized.leftArm.mass,
              trunkMass: synthesized.trunk.mass,
              rightLegMass: synthesized.rightLeg.mass,
              leftLegMass: synthesized.leftLeg.mass,
            },
            lastUpdated: overall.weight.date,
            confidence: 'medium',
          };
          confidence = 'medium';
        } else {
          // Use old InBody but mark as low confidence
          segmental = {
            source: 'inbody',
            data: {
              rightArmPercent: latestInBody.right_arm_percent,
              leftArmPercent: latestInBody.left_arm_percent,
              trunkPercent: latestInBody.trunk_percent,
              rightLegPercent: latestInBody.right_leg_percent,
              leftLegPercent: latestInBody.left_leg_percent,
            },
            lastUpdated: lastInBodyDate,
            confidence: 'low',
          };
          confidence = 'low';
        }
      }
    } else {
      // Priority 2: Synthesize from unified metrics
      const currentWeight = overall.weight.value;
      const currentBodyFat = overall.bodyFat.value;
      
      if (currentWeight && currentBodyFat) {
        const synthesized = synthesizeSegmentalData(
          currentWeight,
          currentBodyFat,
          overall.muscleMass.value || undefined
        );
        
        segmental = {
          source: 'synthesized',
          data: {
            rightArmPercent: synthesized.rightArm.percent,
            leftArmPercent: synthesized.leftArm.percent,
            trunkPercent: synthesized.trunk.percent,
            rightLegPercent: synthesized.rightLeg.percent,
            leftLegPercent: synthesized.leftLeg.percent,
            rightArmMass: synthesized.rightArm.mass,
            leftArmMass: synthesized.leftArm.mass,
            trunkMass: synthesized.trunk.mass,
            rightLegMass: synthesized.rightLeg.mass,
            leftLegMass: synthesized.leftLeg.mass,
          },
          lastUpdated: overall.weight.date,
          confidence: 'medium',
        };
        confidence = 'medium';
      } else {
        // Not enough data
        segmental = {
          source: 'none',
          data: {
            rightArmPercent: null,
            leftArmPercent: null,
            trunkPercent: null,
            rightLegPercent: null,
            leftLegPercent: null,
          },
          lastUpdated: null,
          confidence: 'low',
        };
        confidence = 'low';
      }
    }

    const hasSufficientData = 
      overall.weight.value !== null && 
      (segmental.source === 'inbody' || overall.bodyFat.value !== null);

    return {
      segmental,
      overall,
      confidence,
      lastInBodyDate,
      hasSufficientData,
    };
  }, [inbodyAnalyses, unifiedMetrics, inbodyLoading, unifiedLoading]);

  return enhancedData;
}
