import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface GeneratePlanButtonProps {
  label: string;
  onGenerate: () => void;
}

export function GeneratePlanButton({ label, onGenerate }: GeneratePlanButtonProps) {
  return (
    <Button
      onClick={onGenerate}
      className="w-full max-w-sm h-14 text-lg font-semibold bg-gradient-to-r from-cyan-500 via-primary to-pink-500 hover:from-cyan-600 hover:via-primary/90 hover:to-pink-600 shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300"
    >
      <Sparkles className="w-5 h-5 mr-2" />
      {label}
    </Button>
  );
}
