import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkoutDetail } from "@/hooks/useWorkoutDetail";
import { useStrengthWorkoutLogs } from "@/hooks/useStrengthWorkoutLogs";
import { getWorkoutTypeName } from "@/lib/workout-types";
import { getWorkoutCategory } from "@/lib/workout-category";
import WorkoutOverviewCard from "@/components/workout/detail/WorkoutOverviewCard";
import HeartRateZonesChart from "@/components/workout/detail/HeartRateZonesChart";
import PaceMetricsCard from "@/components/workout/detail/PaceMetricsCard";
import WorkoutMapPlaceholder from "@/components/workout/detail/WorkoutMapPlaceholder";
import WorkoutSplitsTable from "@/components/workout/detail/WorkoutSplitsTable";
import StrengthExercisesList from "@/components/workout/detail/StrengthExercisesList";
import StrengthSummaryCard from "@/components/workout/detail/StrengthSummaryCard";
import { motion } from "framer-motion";

export default function WorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useWorkoutDetail(workoutId || '');

  const workout = data?.workout;
  const category = getWorkoutCategory(workout?.workout_type);

  // Fetch strength logs only for strength workouts
  const { data: strengthData, isLoading: strengthLoading } = useStrengthWorkoutLogs(
    workout?.user_id || '',
    workout?.start_time || ''
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data || !workout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Тренировка не найдена</p>
          <Button onClick={() => navigate('/workouts')} variant="outline">
            Вернуться назад
          </Button>
        </div>
      </div>
    );
  }

  const { zoneData } = data;
  const workoutName = getWorkoutTypeName(workout.workout_type);
  const isStrength = category === 'strength';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/workouts')} 
              variant="ghost"
              size="icon"
              className="hover:bg-secondary/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{workoutName}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isStrength ? 'Силовая тренировка' : 'Детальная информация о тренировке'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Conditional Content Based on Workout Type */}
        {isStrength ? (
          // STRENGTH WORKOUT VIEW
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <WorkoutOverviewCard workout={workout} />
            </motion.div>

            {/* Summary Stats */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              {strengthLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : strengthData?.summary ? (
                <StrengthSummaryCard
                  totalVolume={strengthData.summary.totalVolume}
                  totalExercises={strengthData.summary.totalExercises}
                  totalSets={strengthData.summary.totalSets}
                  bestLift={strengthData.summary.bestLift}
                />
              ) : null}
            </motion.div>

            {/* Exercises List */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-3"
            >
              {strengthLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <StrengthExercisesList exercises={strengthData?.exercises || []} />
              )}
            </motion.div>
          </div>
        ) : (
          // CARDIO / OTHER WORKOUT VIEW
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Overview */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <WorkoutOverviewCard workout={workout} />
            </motion.div>

            {/* Column 2: Heart Rate Zones */}
            {zoneData && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <HeartRateZonesChart zoneData={zoneData} />
              </motion.div>
            )}

            {/* Column 3: Map Placeholder */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-3"
            >
              <WorkoutMapPlaceholder />
            </motion.div>

            {/* Column 4: Pace Metrics */}
            {workout.distance_km && workout.duration_minutes && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-1"
              >
                <PaceMetricsCard 
                  distanceKm={workout.distance_km} 
                  durationMin={workout.duration_minutes} 
                />
              </motion.div>
            )}

            {/* Column 5: Splits */}
            {workout.distance_km && workout.duration_minutes && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2"
              >
                <WorkoutSplitsTable 
                  distanceKm={workout.distance_km} 
                  durationMin={workout.duration_minutes} 
                />
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
