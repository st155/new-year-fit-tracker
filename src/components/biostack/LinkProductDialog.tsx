import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, Unlink, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (productId: string | null) => void;
  currentLinkedId?: string | null;
  itemName: string;
}

interface ProductInfo {
  id: string;
  name: string;
  brand?: string | null;
  image_url?: string | null;
  form?: string | null;
}

export function LinkProductDialog({ 
  open, 
  onOpenChange, 
  onSelect, 
  currentLinkedId,
  itemName 
}: LinkProductDialogProps) {
  const [search, setSearch] = useState("");

  const { data: libraryProducts = [], isLoading } = useQuery({
    queryKey: ['library-products-for-link'],
    queryFn: async (): Promise<ProductInfo[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      
      const { data: library } = await client
        .from('user_supplement_library')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!library?.length) return [];

      const ids = library.map((l: any) => l.product_id).filter(Boolean);
      if (!ids.length) return [];

      const { data: products } = await client
        .from('supplement_products')
        .select('id, name, brand, image_url, form')
        .in('id', ids);

      return (products as ProductInfo[]) || [];
    },
    enabled: open
  });

  const filteredProducts = libraryProducts.filter(product => {
    if (!search) return true;
    const s = search.toLowerCase();
    return product.name?.toLowerCase().includes(s) || product.brand?.toLowerCase().includes(s);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Связать с продуктом</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Выберите продукт для: <span className="font-medium text-foreground">{itemName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {currentLinkedId && (
            <Button variant="outline" className="w-full justify-start gap-2 text-destructive" onClick={() => { onSelect(null); onOpenChange(false); }}>
              <Unlink className="h-4 w-4" /> Убрать связь
            </Button>
          )}

          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">{search ? 'Не найдено' : 'Библиотека пуста'}</p></div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((p) => (
                  <button key={p.id} onClick={() => { onSelect(p.id); onOpenChange(false); }} className={cn("w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left", p.id === currentLinkedId ? "bg-green-500/10 border-green-500/50" : "bg-card hover:bg-accent border-border")}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Pill className="h-5 w-5 text-muted-foreground" /></div>}
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{p.name}</p>{p.brand && <p className="text-xs text-muted-foreground truncate">{p.brand}</p>}</div>
                    {p.id === currentLinkedId && <span className="text-xs font-medium text-green-500">Связан</span>}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
