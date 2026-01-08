import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { useTranslation } from "react-i18next";

interface CompletionButtonProps {
  onClick: () => void;
  isSubmitting: boolean;
}

export function CompletionButton({ onClick, isSubmitting }: CompletionButtonProps) {
  const { t } = useTranslation('workouts');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <EnhancedButton
        onClick={onClick}
        disabled={isSubmitting}
        glow
        className="w-full py-6 text-xl font-bold bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            {t('completion.saving')}
          </>
        ) : (
          <>
            {t('completion.toMain')}
            <ArrowRight className="w-6 h-6 ml-2" />
          </>
        )}
      </EnhancedButton>
    </motion.div>
  );
}
