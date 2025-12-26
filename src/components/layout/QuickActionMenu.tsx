/**
 * QuickActionMenu - Central Floating Action Button with radial menu
 * Opens quick action sheets for common tasks
 */

import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Dumbbell, Pill, Scale, Droplets, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeightLogSheet } from "@/components/quick-actions/WeightLogSheet";
import { SupplementsSheet } from "@/components/quick-actions/SupplementsSheet";
import { WorkoutLogSheet } from "@/components/quick-actions/WorkoutLogSheet";
import { NutritionLogSheet } from "@/components/quick-actions/NutritionLogSheet";
import { DocumentUploadSheet } from "@/components/quick-actions/DocumentUploadSheet";

interface QuickAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
}

export const QuickActionMenu = memo(function QuickActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const { t } = useTranslation("navigation");

  const actions: QuickAction[] = [
    {
      id: "workout",
      icon: Dumbbell,
      label: t("logWorkout", "Workout"),
      color: "text-blue-500",
      bgColor: "bg-blue-500",
    },
    {
      id: "supplements",
      icon: Pill,
      label: t("supplements", "Supplements"),
      color: "text-emerald-500",
      bgColor: "bg-emerald-500",
    },
    {
      id: "weight",
      icon: Scale,
      label: t("logWeight", "Weight"),
      color: "text-purple-500",
      bgColor: "bg-purple-500",
    },
    {
      id: "nutrition",
      icon: Droplets,
      label: t("nutrition", "Water/Meal"),
      color: "text-amber-500",
      bgColor: "bg-amber-500",
    },
    {
      id: "document",
      icon: FileText,
      label: t("uploadDoc", "Upload"),
      color: "text-rose-500",
      bgColor: "bg-rose-500",
    },
  ];

  const handleActionClick = (actionId: string) => {
    setIsOpen(false);
    setTimeout(() => {
      setActiveSheet(actionId);
    }, 150);
  };

  const closeSheet = () => setActiveSheet(null);

  // Calculate positions for radial menu
  const getActionPosition = (index: number, total: number) => {
    // Fan angle from -60 to 60 degrees (120 degree arc)
    const startAngle = -60;
    const endAngle = 60;
    const angleRange = endAngle - startAngle;
    const angleStep = angleRange / (total - 1);
    const angle = (startAngle + angleStep * index) * (Math.PI / 180);
    
    const radius = 100; // Distance from center
    const x = Math.sin(angle) * radius;
    const y = -Math.cos(angle) * radius;
    
    return { x, y };
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
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Radial Menu Actions */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
            {actions.map((action, index) => {
              const position = getActionPosition(index, actions.length);
              return (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{
                    opacity: 1,
                    x: position.x,
                    y: position.y,
                    scale: 1,
                    transition: { 
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    },
                  }}
                  exit={{
                    opacity: 0,
                    x: 0,
                    y: 0,
                    scale: 0.3,
                    transition: { 
                      delay: (actions.length - index) * 0.03,
                      duration: 0.2
                    },
                  }}
                  onClick={() => handleActionClick(action.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shadow-lg",
                    "hover:scale-110 active:scale-95 transition-transform",
                    action.bgColor
                  )}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-foreground bg-background/90 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
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

      {/* Bottom Sheets */}
      <WorkoutLogSheet open={activeSheet === "workout"} onOpenChange={closeSheet} />
      <SupplementsSheet open={activeSheet === "supplements"} onOpenChange={closeSheet} />
      <WeightLogSheet open={activeSheet === "weight"} onOpenChange={closeSheet} />
      <NutritionLogSheet open={activeSheet === "nutrition"} onOpenChange={closeSheet} />
      <DocumentUploadSheet open={activeSheet === "document"} onOpenChange={closeSheet} />
    </>
  );
});
