import { motion } from "framer-motion";
import { useActivityReactions, ReactionType } from "@/hooks/useActivityReactions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityReactionsProps {
  activityId: string;
  userId?: string;
}

const reactionEmojis: Record<ReactionType, string> = {
  thumbs_up: '👍',
  fire: '🔥',
  muscle: '💪',
  party: '🎉',
  heart: '❤️'
};

const reactionLabels: Record<ReactionType, string> = {
  thumbs_up: 'Like',
  fire: 'Fire',
  muscle: 'Strong',
  party: 'Celebrate',
  heart: 'Love'
};

export function ActivityReactions({ activityId, userId }: ActivityReactionsProps) {
  const { reactionCounts, userReactions, toggleReaction } = useActivityReactions(activityId, userId);

  const reactionTypes: ReactionType[] = ['thumbs_up', 'fire', 'muscle', 'party', 'heart'];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TooltipProvider>
        {reactionTypes.map((type) => {
          const count = reactionCounts[type] || 0;
          const hasReacted = userReactions.has(type);

          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => toggleReaction(type)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    "border hover:scale-110 active:scale-95",
                    hasReacted
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background/50 border-border text-muted-foreground hover:bg-accent"
                  )}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={hasReacted ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-base">{reactionEmojis[type]}</span>
                  {count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs font-bold"
                    >
                      {count}
                    </motion.span>
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{reactionLabels[type]}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
