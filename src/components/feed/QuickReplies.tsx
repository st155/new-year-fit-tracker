import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  onReply: (message: string) => void;
}

const quickReplies = [
  { text: "Отличная работа! 💪", emoji: "💪" },
  { text: "Продолжай в том же духе! 🔥", emoji: "🔥" },
  { text: "Ты молодец! 👏", emoji: "👏" },
  { text: "Так держать! 🎯", emoji: "🎯" },
  { text: "Вдохновляюще! ✨", emoji: "✨" }
];

export function QuickReplies({ onReply }: QuickRepliesProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Quick replies:</p>
      <div className="flex flex-wrap gap-2">
        {quickReplies.map((reply, index) => (
          <motion.div
            key={reply.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReply(reply.text)}
              className="text-xs hover:bg-accent hover:scale-105 transition-transform"
            >
              <span className="mr-1.5">{reply.emoji}</span>
              {reply.text}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
