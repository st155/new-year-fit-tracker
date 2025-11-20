import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useSupplementInventory } from "@/hooks/supplements/useSupplementInventory";
import { useAuth } from "@/hooks/useAuth";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AddInventoryDialogProps {
  onClose: () => void;
}

export function AddInventoryDialog({ onClose }: AddInventoryDialogProps) {
  const { user } = useAuth();
  const { addToInventory } = useSupplementInventory(user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    current_servings: 30,
    low_stock_threshold: 10,
    storage_location: "",
  });

  const { data: searchResults } = useQuery({
    queryKey: ["product-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from("supplement_products")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;

    await addToInventory.mutateAsync({
      user_id: user.id,
      product_id: selectedProduct.id,
      current_servings: formData.current_servings,
      initial_servings: formData.current_servings,
      low_stock_threshold: formData.low_stock_threshold,
      storage_location: formData.storage_location || null,
    });

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add to Inventory</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Search Product</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchResults && searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((product: any) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(product);
                      setSearchQuery("");
                    }}
                    className="w-full p-3 text-left hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.brand} • {product.category}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {selectedProduct && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.brand}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of Servings</Label>
              <Input
                type="number"
                min="1"
                value={formData.current_servings}
                onChange={(e) =>
                  setFormData({ ...formData, current_servings: parseInt(e.target.value) })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Low Stock Alert (servings)</Label>
              <Input
                type="number"
                min="1"
                value={formData.low_stock_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Storage Location (optional)</Label>
            <Input
              placeholder="e.g., Kitchen Cabinet, Bedside Drawer"
              value={formData.storage_location}
              onChange={(e) =>
                setFormData({ ...formData, storage_location: e.target.value })
              }
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedProduct} className="flex-1">
              Add to Inventory
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
