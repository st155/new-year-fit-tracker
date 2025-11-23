import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, TrendingUp, Clock, Pill, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StackItemCardProps {
  item: {
    id: string;
    stack_name: string;
    product_id?: string;
    is_active: boolean;
    intake_times: string[];
    linked_biomarker_ids?: string[];
    effectiveness_score?: number;
    ai_suggested?: boolean;
    ai_rationale?: string;
    servings_remaining?: number;
    target_outcome?: string;
    supplement_products?: {
      name: string;
      brand?: string;
      form?: string;
    };
  };
  biomarkerTrend?: number[]; // Mini sparkline data
  servingsRemaining?: number;
  onLogIntake: (itemId: string) => void;
}

export function StackItemCard({ item, biomarkerTrend, servingsRemaining, onLogIntake }: StackItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine neon border based on effectiveness_score
  const effectivenessScore = item.effectiveness_score || 5.0;
  const borderClass = 
    effectivenessScore >= 8 
      ? "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" // Optimized - Neon Green
      : effectivenessScore >= 5
      ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" // Active - Neon Blue
      : "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"; // Warning - Neon Red

  const statusBadge =
    effectivenessScore >= 8
      ? { label: "Optimized", className: "bg-green-500/10 text-green-400 border-green-500/20" }
      : effectivenessScore >= 5
      ? { label: "Active", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" }
      : { label: "Monitoring", className: "bg-red-500/10 text-red-400 border-red-500/20" };

  const showLowStockBadge = servingsRemaining !== undefined && servingsRemaining < 10 && servingsRemaining > 0;

  return (
    <Card 
      className={cn(
        "bg-neutral-950 border transition-all duration-300 hover:scale-[1.02] relative",
        borderClass
      )}
    >
      <div className="p-4 space-y-3">
        {/* Low Stock Badge */}
        {showLowStockBadge && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-orange-500/20 border border-orange-500/50 flex items-center gap-1">
            <span className="text-xs font-semibold text-orange-400">⚠️ {servingsRemaining} left</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {item.supplement_products?.name || item.stack_name}
            </h3>
            {item.supplement_products?.brand && (
              <p className="text-xs text-muted-foreground">
                {item.supplement_products.brand}
              </p>
            )}
          </div>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="text-xs capitalize">
              {item.intake_times.join(", ")}
            </span>
          </div>
          {item.servings_remaining && (
            <div className="flex items-center gap-1">
              <Pill className="h-3 w-3" />
              <span className="text-xs">{item.servings_remaining} left</span>
            </div>
          )}
        </div>

        {/* Effectiveness Indicator */}
        {effectivenessScore >= 8 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
            <TrendingUp className="h-3 w-3 text-green-400" />
            <span className="text-xs text-green-400">Proven Effective</span>
          </div>
        )}

        {/* One-Tap Log Button */}
        <Button
          onClick={() => onLogIntake(item.id)}
          variant="outline"
          size="sm"
          className="w-full bg-neutral-900 hover:bg-neutral-800 border-neutral-700"
        >
          <Check className="h-4 w-4 mr-2" />
          Log Intake
        </Button>

        {/* Expandable Details */}
        {(item.ai_suggested || item.target_outcome || item.linked_biomarker_ids?.length) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn(
              "h-3 w-3 mr-1 transition-transform",
              isExpanded && "rotate-180"
            )} />
            {isExpanded ? "Hide" : "Show"} Details
          </Button>
        )}

        {/* Expanded Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 overflow-hidden"
            >
              {item.target_outcome && (
                <div className="p-3 bg-neutral-900/50 rounded border border-neutral-800">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-muted-foreground mb-1">Target Outcome:</p>
                      <p className="text-foreground">{item.target_outcome}</p>
                    </div>
                  </div>
                </div>
              )}

              {item.ai_suggested && item.ai_rationale && (
                <div className="p-3 bg-green-500/5 rounded border border-green-500/20">
                  <div className="text-xs">
                    <p className="text-green-400 mb-1 flex items-center gap-1">
                      🤖 AI Suggested
                    </p>
                    <p className="text-muted-foreground">{item.ai_rationale}</p>
                  </div>
                </div>
              )}

              {item.linked_biomarker_ids && item.linked_biomarker_ids.length > 0 && (
                <div className="p-3 bg-neutral-900/50 rounded border border-neutral-800">
                  <p className="text-xs text-muted-foreground mb-1">
                    Tracking {item.linked_biomarker_ids.length} biomarker(s)
                  </p>
                  <div className="text-xs text-purple-400">
                    Score: {effectivenessScore.toFixed(1)}/10
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
