import { motion } from "framer-motion";
import { Activity, TrendingUp, CheckCircle2, LucideIcon } from "lucide-react";
import { useProtocolManagement } from "@/hooks/biostack/useProtocolManagement";
import { useAuth } from "@/hooks/useAuth";
import { useTopSupplements } from "@/hooks/biostack/useTopSupplements";

interface SupplementsHeroSectionProps {
  onActiveProtocolsClick?: () => void;
  onAdherenceRateClick?: () => void;
  onOptimizedClick?: () => void;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  glow: string;
  onClick?: () => void;
}

export function SupplementsHeroSection({ 
  onActiveProtocolsClick,
  onAdherenceRateClick,
  onOptimizedClick
}: SupplementsHeroSectionProps) {
  const { user } = useAuth();
  const { activeProtocols, isLoading } = useProtocolManagement();
  const { data: topSupplements } = useTopSupplements(user?.id);

  // Calculate metrics
  const activeProtocolsCount = activeProtocols?.length || 0;
  const totalSupplements = activeProtocols?.reduce((acc, protocol) => 
    acc + (protocol.protocol_items?.length || 0), 0
  ) || 0;
  const optimizedSupplements = topSupplements?.length || 0;

  // Calculate adherence rate (mock for now, could be calculated from intake_logs)
  const adherenceRate = 85;

  const stats: StatItem[] = [
    {
      label: "Active Protocols",
      value: activeProtocolsCount,
      icon: Activity,
      color: "blue",
      glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]",
      onClick: onActiveProtocolsClick
    },
    {
      label: "Adherence Rate",
      value: `${adherenceRate}%`,
      icon: TrendingUp,
      color: "purple",
      glow: "shadow-[0_0_15px_rgba(168,85,247,0.5)]",
      onClick: onAdherenceRateClick
    },
    {
      label: "Optimized",
      value: optimizedSupplements,
      icon: CheckCircle2,
      color: "green",
      glow: "shadow-[0_0_15px_rgba(34,197,94,0.5)]",
      onClick: onOptimizedClick
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`bg-neutral-950 border border-${stat.color}-500/30 rounded-lg p-4 sm:p-6 ${stat.glow} hover:scale-105 transition-transform ${stat.onClick ? 'cursor-pointer' : ''}`}
          onClick={stat.onClick}
        >
          <div className="flex items-center gap-3 mb-2">
            <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${stat.color}-500`} />
            <span className="text-xs sm:text-sm text-muted-foreground">{stat.label}</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold text-${stat.color}-500`}>
            {isLoading ? "..." : stat.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
