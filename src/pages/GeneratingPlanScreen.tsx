import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

export default function GeneratingPlanScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/workouts');
    }, 15000); // 15 seconds - adjust based on actual generation time

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="text-center space-y-8">
        {/* Animated Sparkles */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="flex justify-center"
        >
          <div className="relative">
            <Sparkles className="w-20 h-20 text-primary" />
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Loading Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-500 via-primary to-pink-500 bg-clip-text text-transparent">
            Создаю твой план
          </h1>
          <p className="text-muted-foreground">
            Анализирую твои данные и подбираю оптимальные упражнения...
          </p>
        </div>

        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-primary mx-auto" />
        </motion.div>

        {/* Progress Steps */}
        <div className="space-y-2 text-sm text-muted-foreground max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Расчет объема тренировок</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Подбор упражнений</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Оптимизация прогрессии нагрузок</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
