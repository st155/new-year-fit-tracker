import { motion } from "framer-motion";
import { TrendingUp, History, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SecondaryNavigationProps {
  onCorrelationEngine: () => void;
  onHistory: () => void;
  onImportProtocol: () => void;
}

export function SecondaryNavigation({
  onCorrelationEngine,
  onHistory,
  onImportProtocol
}: SecondaryNavigationProps) {
  const actions = [
    {
      label: "Correlation Engine",
      icon: TrendingUp,
      onClick: onCorrelationEngine,
      color: "purple"
    },
    {
      label: "Protocol History",
      icon: History,
      onClick: onHistory,
      color: "blue"
    },
    {
      label: "Import Protocol",
      icon: FileText,
      onClick: onImportProtocol,
      color: "green"
    }
  ];

  return (
    <div className="mt-12 pt-8 border-t border-neutral-800">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">Advanced Tools</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant="outline"
              className={`w-full h-auto py-4 border-${action.color}-500/30 hover:border-${action.color}-500/50 hover:shadow-[0_0_15px_rgba(var(--${action.color}),0.3)] transition-all`}
              onClick={action.onClick}
            >
              <div className="flex flex-col items-center gap-2">
                <action.icon className={`h-6 w-6 text-${action.color}-500`} />
                <span className="text-sm font-medium">{action.label}</span>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
