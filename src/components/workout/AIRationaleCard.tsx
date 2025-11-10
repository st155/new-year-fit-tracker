import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

export function AIRationaleCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg px-4"
    >
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300 leading-relaxed">
              Наш алгоритм создает персонализированную программу, используя информацию о тебе и твоих целях.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
