import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Star, Library, Package, Eye, Trash2, RefreshCw, Camera, Pill, Sparkles, Clock, Loader2 } from 'lucide-react';
import { useSupplementLibrary, useRemoveFromLibrary } from '@/hooks/biostack/useSupplementLibrary';
import { useBackfillLibrary } from '@/hooks/biostack';
import { useEnrichProduct } from '@/hooks/biostack/useEnrichProduct';
import { useSyncProtocolsToLibrary } from '@/hooks/biostack/useSyncProtocolsToLibrary';
import { SupplementInfoCard } from './SupplementInfoCard';
import { ProductPhotoUploader } from './ProductPhotoUploader';
import { BulkPhotoUploader } from './BulkPhotoUploader';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export function SupplementLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'scan' | 'protocol' | 'manual' | null>(null);
  const [viewProduct, setViewProduct] = useState<any>(null);
  const [photoUploaderProduct, setPhotoUploaderProduct] = useState<{ id: string; name: string } | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const { data: library, isLoading, refetch } = useSupplementLibrary();
  const removeFromLibrary = useRemoveFromLibrary();
  const backfillLibrary = useBackfillLibrary();
  const enrichProduct = useEnrichProduct();
  const syncProtocols = useSyncProtocolsToLibrary();

  // Recently scanned (last 5)
  const recentScans = library?.slice(0, 5) || [];

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
    const matchesSource = !sourceFilter || entry.source === sourceFilter;

    return matchesSearch && matchesTag && matchesSource;
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Library className="h-6 w-6 text-green-500" />
          <h2 className="text-2xl font-bold">My Library</h2>
          <Badge variant="outline">{library?.length || 0}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setBulkUploadOpen(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            size="sm"
          >
            <Camera className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => syncProtocols.mutate()}
            disabled={syncProtocols.isPending}
            variant="outline"
            size="sm"
          >
            {syncProtocols.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Protocols
          </Button>
        </div>
      </div>

      {/* Recently Scanned */}
      {recentScans.length > 0 && (
        <Card className="p-4 bg-neutral-900/50 border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold text-sm">🕐 Recently Scanned</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                className="w-20 flex-shrink-0 text-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setViewProduct(scan.supplement_products)}
              >
                {scan.supplement_products.image_url ? (
                  <img
                    src={scan.supplement_products.image_url}
                    alt={scan.supplement_products.name}
                    className="w-20 h-20 rounded-lg object-cover mb-1"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-neutral-800 flex items-center justify-center mb-1">
                    <Pill className="h-8 w-8 text-neutral-600" />
                  </div>
                )}
                <p className="text-xs truncate">{scan.supplement_products.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(scan.updated_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search supplements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Source Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={sourceFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSourceFilter(null)}
          >
            All
          </Button>
          <Button
            variant={sourceFilter === 'scan' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSourceFilter('scan')}
          >
            📷 Scanned
          </Button>
          <Button
            variant={sourceFilter === 'protocol' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSourceFilter('protocol')}
          >
            📋 From Protocol
          </Button>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground self-center">Tags:</span>
            {allTags.map(tag => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}
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
                {/* Image or Placeholder */}
                {entry.supplement_products.image_url ? (
                  <div className="aspect-square bg-neutral-800 rounded-lg mb-3 overflow-hidden">
                    <img
                      src={entry.supplement_products.image_url}
                      alt={entry.supplement_products.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-neutral-800 rounded-lg mb-3 flex items-center justify-center">
                    <Pill className="h-16 w-16 text-neutral-600" />
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
                  {/* Enrichment Status */}
                  {entry.enrichment_status === 'enriched' && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      ✅ Enriched
                    </Badge>
                  )}
                  {entry.enrichment_status === 'partial' && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                      ⚠️ Partial
                    </Badge>
                  )}
                  {entry.enrichment_status === 'not_enriched' && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                      ❌ Not enriched
                    </Badge>
                  )}
                  
                  {entry.source === 'protocol' && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                      📋 From Protocol
                    </Badge>
                  )}
                  {entry.is_in_stack && (
                    <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50">
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
                <div className="flex gap-2 flex-wrap">
                  {!entry.supplement_products.image_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPhotoUploaderProduct({
                        id: entry.product_id,
                        name: entry.supplement_products.name
                      })}
                      className="border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Re-enrich button for non-enriched products */}
                  {entry.enrichment_status !== 'enriched' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => enrichProduct.mutate(entry.product_id)}
                      disabled={enrichProduct.isPending}
                      className="border-yellow-500/30 hover:bg-yellow-500/10"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  )}
                  
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
              product={viewProduct}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Uploader Modal */}
      {photoUploaderProduct && (
        <ProductPhotoUploader
          isOpen={!!photoUploaderProduct}
          onClose={() => setPhotoUploaderProduct(null)}
          productId={photoUploaderProduct.id}
          productName={photoUploaderProduct.name}
        />
      )}

      {/* Bulk Photo Uploader */}
      <BulkPhotoUploader
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onComplete={() => {
          refetch();
        }}
      />
    </div>
  );
}