import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { StockLevelIndicator } from "./StockLevelIndicator";
import { format } from "date-fns";
import { useSupplementInventory } from "@/hooks/supplements/useSupplementInventory";
import { useAuth } from "@/hooks/useAuth";

interface InventoryItemCardProps {
  item: any;
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
  const { user } = useAuth();
  const { updateInventory, removeFromInventory } = useSupplementInventory(user?.id);
  const product = item.supplement_products;

  const handleAddMore = () => {
    updateInventory.mutate({
      id: item.id,
      updates: {
        current_servings: item.current_servings + item.initial_servings,
        initial_servings: item.initial_servings,
      },
    });
  };

  return (
    <Card className={`glass-card hover:shadow-glow transition-all ${
      item.is_low_alert ? "border-destructive/50" : ""
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-lg">{product?.name}</h4>
              {item.is_low_alert && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {product?.brand} • {product?.category}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFromInventory.mutate(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StockLevelIndicator
          current={item.current_servings}
          original={item.initial_servings}
          threshold={item.low_stock_threshold}
        />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Daily usage:</span>{" "}
            <span className="font-medium">
              {item.daily_usage_rate?.toFixed(1) || "N/A"}
            </span>
          </div>
          {item.estimated_depletion_date && (
            <div>
              <span className="text-muted-foreground">Runs out:</span>{" "}
              <span className="font-medium">
                {format(new Date(item.estimated_depletion_date), "MMM dd")}
              </span>
            </div>
          )}
        </div>

        {item.storage_location && (
          <div className="text-sm">
            <span className="text-muted-foreground">Location:</span>{" "}
            <span className="font-medium">{item.storage_location}</span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleAddMore}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add More Stock
        </Button>
      </CardContent>
    </Card>
  );
}
