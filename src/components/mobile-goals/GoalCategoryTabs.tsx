import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dumbbell, Dna, Sparkles, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CompactGoalCard } from "./CompactGoalCard";
import type { ChallengeGoal } from "@/features/goals/types";
import { cn } from "@/lib/utils";

interface GoalCategoryTabsProps {
  categories: {
    fitness: ChallengeGoal[];
    biostack: ChallengeGoal[];
    habits: ChallengeGoal[];
    challenge: ChallengeGoal[];
  };
  onGoalClick?: (goal: ChallengeGoal) => void;
}

const tabConfig = [
  { 
    value: "fitness", 
    label: "Fitness", 
    icon: Dumbbell, 
    color: "text-blue-500" 
  },
  { 
    value: "biostack", 
    label: "BioStack", 
    icon: Dna, 
    color: "text-purple-500" 
  },
  { 
    value: "habits", 
    label: "Habits", 
    icon: Sparkles, 
    color: "text-cyan-500" 
  },
  { 
    value: "challenge", 
    label: "Challenge", 
    icon: Flame, 
    color: "text-orange-500" 
  },
];

function GoalList({ 
  goals, 
  onGoalClick 
}: { 
  goals: ChallengeGoal[]; 
  onGoalClick?: (goal: ChallengeGoal) => void;
}) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">No goals in this category</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.05 }
        }
      }}
    >
      {goals.map((goal, index) => (
        <CompactGoalCard 
          key={goal.id} 
          goal={goal} 
          delay={index}
          onClick={() => onGoalClick?.(goal)}
        />
      ))}
    </motion.div>
  );
}

export function GoalCategoryTabs({ categories, onGoalClick }: GoalCategoryTabsProps) {
  // Find first category with goals
  const firstWithGoals = tabConfig.find(tab => 
    categories[tab.value as keyof typeof categories].length > 0
  )?.value || "fitness";

  // Count goals per category
  const counts = {
    fitness: categories.fitness.length,
    biostack: categories.biostack.length,
    habits: categories.habits.length,
    challenge: categories.challenge.length,
  };

  return (
    <div className="px-4 pb-24">
      <Tabs defaultValue={firstWithGoals} className="w-full">
        <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-xl grid grid-cols-4 gap-1">
          {tabConfig.map((tab) => {
            const count = counts[tab.value as keyof typeof counts];
            const Icon = tab.icon;
            
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg",
                  "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                  "transition-all"
                )}
              >
                <Icon className={cn("h-4 w-4", tab.color)} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {count > 0 && (
                  <span className="text-[9px] text-muted-foreground">({count})</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <AnimatePresence mode="wait">
          {tabConfig.map((tab) => (
            <TabsContent 
              key={tab.value} 
              value={tab.value} 
              className="mt-4"
            >
              <GoalList 
                goals={categories[tab.value as keyof typeof categories]} 
                onGoalClick={onGoalClick}
              />
            </TabsContent>
          ))}
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
