import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface PreviewPanelProps {
  name: string;
  description: string;
  category: string;
  duration: number;
  disciplines: Array<{
    name: string;
    type: string;
    benchmarkValue: number;
    unit: string;
  }>;
}

export const PreviewPanel = ({
  name,
  description,
  category,
  duration,
  disciplines,
}: PreviewPanelProps) => {
  return (
    <Card className="p-6 bg-card border-2 border-primary/50 shadow-xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">AI-Generated Challenge</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Challenge Name</Label>
            <p className="font-semibold text-foreground mt-1">{name}</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <p className="text-sm text-foreground mt-1">{description}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{category}</Badge>
            <Badge variant="outline">{duration} weeks</Badge>
            <Badge variant="outline">{disciplines.length} disciplines</Badge>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Disciplines & Benchmarks</Label>
            <div className="space-y-2">
              {disciplines.map((discipline, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 rounded-lg bg-primary/10 border border-primary/20"
                >
                  <span className="text-sm font-medium text-foreground">{discipline.name}</span>
                  <span className="text-sm font-bold text-primary">
                    {discipline.benchmarkValue} {discipline.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Label = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={className}>{children}</div>
);
