import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Package, CheckCircle2 } from 'lucide-react';
import { useSupplementLibrary } from '@/hooks/biostack/useSupplementLibrary';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface LibrarySupplementPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (productIds: string[]) => void;
}

export function LibrarySupplementPicker({
  open,
  onOpenChange,
  onSelect,
}: LibrarySupplementPickerProps) {
  const { t } = useTranslation('biostack');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const { data: library, isLoading } = useSupplementLibrary();

  const filteredLibrary = library?.filter(entry =>
    entry.supplement_products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.supplement_products.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (productId: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProducts(newSet);
  };

  const handleAdd = () => {
    onSelect(Array.from(selectedProducts));
    setSelectedProducts(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-neutral-950 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            {t('library.addFromLibrary')}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('library.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Grid */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filteredLibrary && filteredLibrary.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredLibrary.map((entry) => {
                const isSelected = selectedProducts.has(entry.product_id);
                const isDisabled = entry.is_in_stack;

                return (
                  <div
                    key={entry.id}
                    className={`
                      p-4 rounded-lg border cursor-pointer transition-all
                      ${isDisabled
                        ? 'border-neutral-700 bg-neutral-900/30 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'border-green-500 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                        : 'border-neutral-700 bg-neutral-900/50 hover:border-green-500/50'
                      }
                    `}
                    onClick={() => !isDisabled && toggleSelection(entry.product_id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => !isDisabled && toggleSelection(entry.product_id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                          {entry.supplement_products.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {entry.supplement_products.brand || t('library.unknownBrand')}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 mt-1">
                          {isDisabled && (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/50 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('library.inStack')}
                            </Badge>
                          )}

                          {entry.custom_rating && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                              ⭐ {entry.custom_rating}/5
                            </Badge>
                          )}

                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {t('library.scannedCount', { count: entry.scan_count })}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t('library.empty')}</p>
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          <div className="text-sm text-muted-foreground">
            {t('library.selected', { count: selectedProducts.size })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('library.cancel')}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedProducts.size === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Package className="mr-2 h-4 w-4" />
              {t('library.addToStack', { count: selectedProducts.size })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
