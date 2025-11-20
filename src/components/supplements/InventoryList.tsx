import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSupplementInventory } from "@/hooks/supplements/useSupplementInventory";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/page-loader";
import { Plus, AlertTriangle } from "lucide-react";
import { InventoryItemCard } from "./InventoryItemCard";
import { useState } from "react";
import { AddInventoryDialog } from "./AddInventoryDialog";

export function InventoryList() {
  const { user } = useAuth();
  const { inventory, lowStockAlerts, isLoading } = useSupplementInventory(user?.id);
  const [showAddDialog, setShowAddDialog] = useState(false);

  if (isLoading) return <PageLoader message="Loading inventory..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supplement Inventory</h2>
          {lowStockAlerts && lowStockAlerts.length > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {lowStockAlerts.length} item(s) running low
            </p>
          )}
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add to Inventory
        </Button>
      </div>

      {showAddDialog && (
        <AddInventoryDialog onClose={() => setShowAddDialog(false)} />
      )}

      {!inventory || inventory.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No items in inventory</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Item
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inventory.map((item: any) => (
            <InventoryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
