import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
import { SupplementTimeline } from "./SupplementTimeline";
import { StockLevelIndicator } from "./StockLevelIndicator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProtocolItemCardProps {
  item: any;
}

export function ProtocolItemCard({ item }: ProtocolItemCardProps) {
  const { user } = useAuth();
  const product = item.supplement_products;

  // Get inventory level for this product
  const { data: inventory } = useQuery({
    queryKey: ["product-inventory", user?.id, item.product_id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data } = await supabase
        .from("user_inventory")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", item.product_id)
        .maybeSingle();

      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <Card className="glass-card hover:shadow-glow transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-semibold text-lg">{product?.name}</h4>
            <p className="text-sm text-muted-foreground">
              {product?.brand} • {product?.category}
            </p>
          </div>
          {item.priority && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                item.priority === "high"
                  ? "bg-destructive/20 text-destructive"
                  : item.priority === "medium"
                  ? "bg-warning/20 text-warning"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {item.priority}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Dosage:</span>{" "}
            <span className="font-medium">
              {item.servings_per_intake} {product?.serving_unit}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Frequency:</span>{" "}
            <span className="font-medium">{item.frequency || "Daily"}</span>
          </div>
        </div>

        {item.intake_times && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Timing:</p>
            <SupplementTimeline times={item.intake_times} />
          </div>
        )}

        {item.notes && (
          <div className="text-sm p-3 bg-muted rounded-lg">
            <p className="text-muted-foreground">{item.notes}</p>
          </div>
        )}

        {inventory && (
          <StockLevelIndicator
            current={inventory.current_servings}
            original={inventory.initial_servings}
            threshold={inventory.low_stock_threshold}
          />
        )}
      </CardContent>
    </Card>
  );
}
