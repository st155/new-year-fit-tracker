import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { NeuralNetworkIcon } from '@/components/workout/NeuralNetworkIcon';
import { DynamicProgressText } from '@/components/workout/DynamicProgressText';
import { ProgressDots } from '@/components/workout/ProgressDots';
import { BackgroundWaves } from '@/components/workout/BackgroundWaves';
import { AIRationaleCard } from '@/components/workout/AIRationaleCard';

export default function GeneratingPlanScreen() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Increment progress every 500ms
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (100 / 30); // 15 seconds total
      });
    }, 500);
    
    // Increment step every 2 seconds
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % 7);
    }, 2000);
    
    // Navigate after completion
    const timer = setTimeout(() => {
      navigate('/workouts');
    }, 15000);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0a]">
      {/* Background waves */}
      <BackgroundWaves />
      
      {/* Main content */}
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl backdrop-blur-xl bg-white/5 border border-white/10 rounded-[40px] p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-400 via-green-400 to-cyan-400 bg-clip-text text-transparent"
          >
            Генерация твоего плана AI
          </motion.h1>
          
          {/* Central Neural Network Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center mb-8"
          >
            <NeuralNetworkIcon />
          </motion.div>
          
          {/* Dynamic Progress Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <DynamicProgressText currentStep={currentStep} />
          </motion.div>
          
          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 mb-6"
          >
            <Progress 
              value={progress} 
              className="h-2 bg-gray-800/50"
            />
          </motion.div>
          
          {/* Pagination Dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <ProgressDots currentStep={currentStep} totalDots={7} />
          </motion.div>
          
          {/* Status Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center text-sm text-gray-400 mt-8 tracking-wider"
          >
            ГЕНЕРИРУЮ ТВОЮ НОВУЮ ПРОГРАММУ...
          </motion.p>
        </motion.div>
      </div>
      
      {/* Bottom AI Rationale Card */}
      <AIRationaleCard />
    </div>
  );
}
