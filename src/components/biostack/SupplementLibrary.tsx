import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Star, Library, Package, Eye, Trash2, RefreshCw } from 'lucide-react';
import { useSupplementLibrary, useRemoveFromLibrary } from '@/hooks/biostack/useSupplementLibrary';
import { useBackfillLibrary } from '@/hooks/biostack';
import { SupplementInfoCard } from './SupplementInfoCard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export function SupplementLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<any>(null);

  const { data: library, isLoading } = useSupplementLibrary();
  const removeFromLibrary = useRemoveFromLibrary();
  const backfillLibrary = useBackfillLibrary();

  // Get all unique tags
  const allTags = Array.from(
    new Set(
      library?.flatMap(entry => entry.tags || []) || []
    )
  );

  // Filter library
  const filteredLibrary = library?.filter(entry => {
    const matchesSearch = entry.supplement_products.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      entry.supplement_products.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || entry.tags?.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Library className="h-6 w-6 text-green-500" />
          <h2 className="text-2xl font-bold">My Library</h2>
          <Badge variant="outline">{library?.length || 0}</Badge>
        </div>
        <Button
          onClick={() => backfillLibrary.mutate()}
          disabled={backfillLibrary.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${backfillLibrary.isPending ? 'animate-spin' : ''}`} />
          Sync from Stack
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search supplements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Tag Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedTag === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTag(null)}
          >
            All
          </Button>
          {allTags.map(tag => (
            <Button
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {!library || library.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <Library className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Library is empty</h3>
            <p className="text-sm text-muted-foreground">
              Scan supplement bottles to build your personal library
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Library Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLibrary?.map((entry) => (
              <Card
                key={entry.id}
                className="p-4 border border-blue-500/30 bg-neutral-900/50 hover:bg-neutral-900 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
              >
                {/* Image */}
                {entry.supplement_products.image_url && (
                  <div className="aspect-square bg-neutral-800 rounded-lg mb-3 overflow-hidden">
                    <img
                      src={entry.supplement_products.image_url}
                      alt={entry.supplement_products.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Title */}
                <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                  {entry.supplement_products.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {entry.supplement_products.brand || 'Unknown brand'}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {entry.is_in_stack && (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                      ✅ In Stack
                    </Badge>
                  )}
                  {entry.custom_rating && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {entry.custom_rating}
                    </Badge>
                  )}
                </div>

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {entry.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <p className="text-xs text-muted-foreground mb-4">
                  Scanned {entry.scan_count} time{entry.scan_count !== 1 ? 's' : ''} · First scan:{' '}
                  {new Date(entry.first_scanned_at).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewProduct(entry.supplement_products)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromLibrary.mutate(entry.product_id)}
                    disabled={removeFromLibrary.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* No Results */}
          {filteredLibrary?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No supplements match your filters</p>
            </div>
          )}
        </>
      )}

      {/* View Product Modal */}
      <Dialog open={!!viewProduct} onOpenChange={(open) => !open && setViewProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-950 border-blue-500/50">
          {viewProduct && (
            <SupplementInfoCard
              product={{
                id: viewProduct.id,
                name: viewProduct.name,
                brand: viewProduct.brand,
                form: viewProduct.form,
                image_url: viewProduct.image_url,
                description: viewProduct.description,
                avg_rating: viewProduct.avg_rating,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}