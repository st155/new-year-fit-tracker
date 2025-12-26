/**
 * SuperFAB - Central Floating Action Button for quick actions
 * Positioned in the center of BottomNav
 */

import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Dumbbell, Pill, Target, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  color: string;
}

export const SuperFAB = memo(function SuperFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation("navigation");

  const actions: FABAction[] = [
    {
      icon: Dumbbell,
      label: t("workouts"),
      action: () => navigate("/workouts"),
      color: "bg-blue-500",
    },
    {
      icon: Pill,
      label: t("supplements"),
      action: () => navigate("/supplements"),
      color: "bg-emerald-500",
    },
    {
      icon: Target,
      label: t("habits"),
      action: () => navigate("/habits"),
      color: "bg-amber-500",
    },
    {
      icon: Camera,
      label: t("body"),
      action: () => navigate("/body"),
      color: "bg-purple-500",
    },
  ];

  const handleActionClick = (action: FABAction) => {
    action.action();
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Actions */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse items-center gap-3">
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { delay: index * 0.05 },
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  scale: 0.8,
                  transition: { delay: (actions.length - index) * 0.03 },
                }}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full shadow-lg",
                  "bg-card border border-border/50",
                  "hover:scale-105 active:scale-95 transition-transform"
                )}
              >
                <div className={cn("p-2 rounded-full", action.color)}>
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-foreground whitespace-nowrap">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-5 left-1/2 -translate-x-1/2 z-50",
          "flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-gradient-to-br from-primary to-primary/80",
          "shadow-lg shadow-primary/30",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
          "active:scale-95 transition-transform"
        )}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <Plus className="h-6 w-6 text-primary-foreground" />
        )}
      </motion.button>
    </>
  );
});
