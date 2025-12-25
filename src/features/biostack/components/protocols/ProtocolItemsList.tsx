import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock } from "lucide-react";

interface ProtocolItemsListProps {
  items: Array<{
    id: string;
    daily_dosage?: number;
    intake_times?: string[];
    notes?: string;
    supplement_products?: {
      name: string;
      brand?: string;
      form?: string;
    };
  }>;
  onLogItem: (itemId: string, servingsTaken?: number) => void;
}

export function ProtocolItemsList({ items, onLogItem }: ProtocolItemsListProps) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No items in this protocol
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-3 border-t border-border">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
        >
          <div className="flex-1 min-w-0 space-y-1">
            <div className="font-medium text-sm text-foreground">
              {item.supplement_products?.name || 'Unknown Supplement'}
            </div>
            
            {item.supplement_products?.brand && (
              <div className="text-xs text-muted-foreground">
                {item.supplement_products.brand}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {item.daily_dosage && (
                <Badge variant="outline" className="text-xs">
                  {item.daily_dosage}mg
                </Badge>
              )}
              {item.intake_times && item.intake_times.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="capitalize">{item.intake_times.join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onLogItem(item.id)}
            className="shrink-0"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
