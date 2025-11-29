import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getInstructionInfo } from '@/lib/supplement-timing';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IntakeInstructionBadgeProps {
  instruction?: string;
  className?: string;
}

export function IntakeInstructionBadge({ instruction, className }: IntakeInstructionBadgeProps) {
  if (!instruction) return null;

  const info = getInstructionInfo(instruction);
  if (!info) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs border-border/50 bg-background/50",
              className
            )}
          >
            {info.icon} {info.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{info.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
