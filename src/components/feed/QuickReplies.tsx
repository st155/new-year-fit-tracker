import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  onReply: (message: string) => void;
}

export function QuickReplies({ onReply }: QuickRepliesProps) {
  const { t } = useTranslation('feed');

  const quickReplies = [
    { key: 'greatWork', emoji: "💪" },
    { key: 'keepItUp', emoji: "🔥" },
    { key: 'wellDone', emoji: "👏" },
    { key: 'stayStrong', emoji: "🎯" },
    { key: 'inspiring', emoji: "✨" }
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{t('quickReplies.label')}</p>
      <div className="flex flex-wrap gap-2">
        {quickReplies.map((reply, index) => {
          const text = t(`quickReplies.${reply.key}`);
          return (
            <motion.div
              key={reply.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReply(text)}
                className="text-xs hover:bg-accent hover:scale-105 transition-transform"
              >
                <span className="mr-1.5">{reply.emoji}</span>
                {text}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
