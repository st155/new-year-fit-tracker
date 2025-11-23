import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FindingCardProps {
  finding: {
    id: string;
    body_part: string;
    finding_text: string;
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
    tags?: string[];
  };
}

const severityLabels: Record<string, string> = {
  normal: 'Normal',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
};

const severityColors = {
  normal: {
    border: 'border-green-500/50',
    shadow: 'shadow-[0_0_10px_rgba(34,197,94,0.2)]',
    badge: 'bg-green-500/20 text-green-400 border-green-500/50',
  },
  mild: {
    border: 'border-yellow-500/50',
    shadow: 'shadow-[0_0_10px_rgba(234,179,8,0.2)]',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  },
  moderate: {
    border: 'border-orange-500/50',
    shadow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  },
  severe: {
    border: 'border-red-500/50',
    shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    badge: 'bg-red-500/20 text-red-400 border-red-500/50',
  },
};

export const FindingCard = ({ finding }: FindingCardProps) => {
  const colors = severityColors[finding.severity];

  return (
    <Card
      className={cn(
        'border transition-all duration-200 hover:scale-[1.01] bg-neutral-900',
        colors.border,
        colors.shadow
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-foreground">{finding.body_part}</div>
          <Badge className={cn('border', colors.badge)}>
            {severityLabels[finding.severity]}
          </Badge>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">{finding.finding_text}</p>
        {finding.tags && finding.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {finding.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
