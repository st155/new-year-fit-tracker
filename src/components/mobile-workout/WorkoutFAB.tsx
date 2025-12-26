/**
 * WorkoutFAB - Floating Action Button with action chips
 * Main "Start Workout" button + Log Manual / Scan QR chips
 */

import { motion } from "framer-motion";
import { Play, FileText, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutFABProps {
  onStartWorkout: () => void;
  onLogManual: () => void;
  onScanQR?: () => void;
  isStartDisabled?: boolean;
  startButtonLabel?: string;
}

export function WorkoutFAB({
  onStartWorkout,
  onLogManual,
  onScanQR,
  isStartDisabled = false,
  startButtonLabel = "Start Workout"
}: WorkoutFABProps) {
  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 px-4">
      <div className="max-w-md mx-auto flex items-center justify-center gap-3">
        {/* Log Manual chip */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogManual}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-full",
            "bg-card/90 backdrop-blur-sm border border-border/50",
            "text-sm font-medium text-foreground",
            "shadow-lg hover:shadow-xl transition-all"
          )}
        >
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Log Manual</span>
        </motion.button>

        {/* Main FAB */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartWorkout}
          disabled={isStartDisabled}
          className={cn(
            "flex items-center gap-2 px-6 py-4 rounded-full",
            "bg-gradient-to-r from-orange-500 to-red-500",
            "text-white font-semibold text-base",
            "shadow-[0_0_20px_rgba(249,115,22,0.4)]",
            "hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]",
            "transition-all duration-300",
            isStartDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Play className="w-5 h-5" fill="currentColor" />
          {startButtonLabel}
        </motion.button>

        {/* Scan QR chip */}
        {onScanQR && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onScanQR}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full",
              "bg-card/90 backdrop-blur-sm border border-border/50",
              "text-sm font-medium text-foreground",
              "shadow-lg hover:shadow-xl transition-all"
            )}
          >
            <QrCode className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Scan QR</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
