import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BackgroundWaves } from '@/components/workout/BackgroundWaves';
import LiveLoggerHeader from '@/components/workout/logger/LiveLoggerHeader';
import ExerciseDetailsCard from '@/components/workout/logger/ExerciseDetailsCard';
import WeightSlider from '@/components/workout/logger/WeightSlider';
import SetLoggerCard from '@/components/workout/logger/SetLoggerCard';
import RestTimer from '@/components/workout/logger/RestTimer';
import SetHistoryList from '@/components/workout/logger/SetHistoryList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdjustedExercise } from '@/hooks/useDailyWorkout';

interface WorkoutData {
  planId: string;
  weekNumber: number;
  dayOfWeek: number;
  workoutName: string;
  exercises: AdjustedExercise[];
}

interface SetLog {
  set_number: number;
  actual_weight: number;
  actual_reps: number;
  actual_rpe?: number;
  actual_rir?: number;
  logged: boolean;
}

export default function WorkoutLiveLogger() {
  const navigate = useNavigate();
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);
  const [currentRPE, setCurrentRPE] = useState(7);
  const [loggedSets, setLoggedSets] = useState<SetLog[]>([]);
  const [isResting, setIsResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Track workout start time
  useEffect(() => {
    if (!sessionStorage.getItem('workoutStartTime')) {
      sessionStorage.setItem('workoutStartTime', new Date().toISOString());
    }
  }, []);
  
  // Load workout data from sessionStorage
  useEffect(() => {
    const data = sessionStorage.getItem('activeWorkout');
    if (data) {
      const parsed = JSON.parse(data);
      setWorkoutData(parsed);
      setCurrentReps(parsed.exercises[0]?.reps || 0);
      setSelectedWeight(parsed.exercises[0]?.weight || 0);
    } else {
      navigate('/workouts');
    }
  }, [navigate]);

  // Get user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  if (!workoutData) return null;

  const currentExercise = workoutData.exercises[currentExerciseIndex];
  const totalSets = currentExercise.sets;
  const progressPercent = ((currentSetNumber - 1) / totalSets) * 100;

  const handleCompleteSet = async () => {
    if (!userId) {
      toast.error('Not authenticated');
      return;
    }

    // Save set to database
    const setLog: SetLog = {
      set_number: currentSetNumber,
      actual_weight: selectedWeight,
      actual_reps: currentReps,
      actual_rpe: currentRPE,
      logged: true
    };

    try {
      const { error } = await supabase.from('workout_logs').insert({
        user_id: userId,
        assigned_plan_id: workoutData.planId,
        day_of_week: workoutData.dayOfWeek,
        workout_name: workoutData.workoutName,
        exercise_name: currentExercise.name,
        set_number: currentSetNumber,
        target_weight: currentExercise.weight || null,
        actual_weight: selectedWeight,
        target_reps: currentExercise.reps,
        actual_reps: currentReps,
        target_rpe: currentExercise.rpe || null,
        actual_rpe: currentRPE,
        target_rir: currentExercise.rir || null,
        performed_at: new Date().toISOString()
      });

      if (error) throw error;

      setLoggedSets([...loggedSets, setLog]);
      toast.success(`Set ${currentSetNumber} completed!`);
      
      // Start rest timer
      if (currentSetNumber < totalSets) {
        setIsResting(true);
        setRestTimeRemaining(currentExercise.rest_seconds || 90);
      } else {
        // Exercise complete
        handleNextExercise();
      }
    } catch (error) {
      console.error('Error saving set:', error);
      toast.error('Failed to save set');
    }
  };

  const handleRestComplete = () => {
    setIsResting(false);
    setCurrentSetNumber(currentSetNumber + 1);
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < workoutData.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetNumber(1);
      setLoggedSets([]);
      setSelectedWeight(workoutData.exercises[currentExerciseIndex + 1].weight || 0);
      setCurrentReps(workoutData.exercises[currentExerciseIndex + 1].reps || 0);
      toast.success('Next exercise!', {
        description: workoutData.exercises[currentExerciseIndex + 1].name
      });
    } else {
      // Workout complete - navigate to summary
      const workoutSummaryData = {
        planId: workoutData.planId,
        weekNumber: workoutData.weekNumber,
        dayOfWeek: workoutData.dayOfWeek,
        workoutName: workoutData.workoutName,
      };
      sessionStorage.setItem('workoutSummary', JSON.stringify(workoutSummaryData));
      sessionStorage.removeItem('activeWorkout');
      navigate('/workouts/summary');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      <BackgroundWaves />
      
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-2xl space-y-6 pb-24">
        {/* Header */}
        <LiveLoggerHeader
          exerciseName={currentExercise.name}
          currentSet={currentSetNumber}
          totalSets={totalSets}
          onExit={() => navigate('/workouts')}
          progressPercent={progressPercent}
        />

        {/* Exercise Details */}
        <ExerciseDetailsCard exercise={currentExercise} />

        {/* Weight Selector */}
        <WeightSlider
          value={selectedWeight}
          onChange={setSelectedWeight}
          min={0}
          max={200}
          step={2.5}
        />

        {/* Set Logger */}
        {!isResting && (
          <SetLoggerCard
            setNumber={currentSetNumber}
            reps={currentReps}
            onRepsChange={setCurrentReps}
            rpe={currentRPE}
            onRPEChange={setCurrentRPE}
            onComplete={handleCompleteSet}
            targetReps={currentExercise.reps}
          />
        )}

        {/* Rest Timer */}
        <AnimatePresence>
          {isResting && (
            <RestTimer
              duration={restTimeRemaining}
              onComplete={handleRestComplete}
              onSkip={handleRestComplete}
            />
          )}
        </AnimatePresence>

        {/* Previous Sets */}
        {loggedSets.length > 0 && (
          <SetHistoryList sets={loggedSets} />
        )}
      </div>
    </div>
  );
}
