import { useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, X, CheckCircle2, AlertCircle, Loader2, ImagePlus } from 'lucide-react';
import { useBulkScanSupplements, BulkUploadItem } from '@/hooks/biostack/useBulkScanSupplements';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BulkPhotoUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function BulkPhotoUploader({ open, onOpenChange, onComplete }: BulkPhotoUploaderProps) {
  const {
    items,
    isProcessing,
    progress,
    addFiles,
    removeItem,
    startProcessing,
    cancelProcessing,
    reset,
  } = useBulkScanSupplements();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const count = e.target.files.length;
      addFiles(e.target.files);
      toast.info(`📸 Added ${count} photo${count > 1 ? 's' : ''} to queue`);
    }
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleClose = () => {
    if (!isProcessing) {
      reset();
      onOpenChange(false);
      if (progress.current > 0 && onComplete) {
        onComplete();
      }
    }
  };

  const getStatusIcon = (item: BulkUploadItem) => {
    switch (item.status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">📷 Bulk Supplement Upload</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Drop Zone */}
          {items.length === 0 && (
            <div className="space-y-4">
              {/* Desktop Upload */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="relative border-2 border-dashed border-muted hover:border-primary/50 rounded-lg p-12 text-center transition-colors cursor-pointer bg-neutral-950/50"
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="desktop-upload"
                />
                <div className="space-y-4">
                  <div className="flex justify-center gap-4">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Drop 10-20 photos here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload supplement bottle photos for automatic recognition
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile Options */}
              <div className="md:hidden space-y-3">
                {/* Select from Gallery - MULTIPLE */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="mobile-gallery"
                />
                <label htmlFor="mobile-gallery">
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    asChild
                  >
                    <span className="cursor-pointer flex items-center justify-center gap-2">
                      <ImagePlus className="h-5 w-5" />
                      🖼️ Select from Gallery (Multiple)
                    </span>
                  </Button>
                </label>
                
                {/* Take Photo - SINGLE */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="mobile-camera"
                />
                <label htmlFor="mobile-camera">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    asChild
                  >
                    <span className="cursor-pointer flex items-center justify-center gap-2">
                      <Camera className="h-5 w-5" />
                      📷 Take Photo (Single)
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {/* File List */}
          {items.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Queue ({items.filter(i => i.status === 'pending').length} pending)
                  </h3>
                  {!isProcessing && (
                    <div className="flex gap-2">
                      {/* Desktop: Add more files */}
                      <div className="hidden md:block">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          id="add-more-files"
                        />
                        <label htmlFor="add-more-files">
                          <Button variant="outline" size="sm" asChild>
                            <span className="cursor-pointer">
                              <Upload className="h-4 w-4 mr-2" />
                              Add More
                            </span>
                          </Button>
                        </label>
                      </div>
                      
                      {/* Mobile: Add More Options */}
                      <div className="md:hidden flex gap-2">
                        {/* Add from Gallery */}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          id="add-from-gallery"
                        />
                        <label htmlFor="add-from-gallery">
                          <Button variant="outline" size="sm" asChild>
                            <span className="cursor-pointer flex items-center gap-1">
                              <ImagePlus className="h-4 w-4" />
                              🖼️ Gallery
                            </span>
                          </Button>
                        </label>
                        
                        {/* Take Another Photo */}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="take-another-photo"
                        />
                        <label htmlFor="take-another-photo">
                          <Button variant="outline" size="sm" asChild>
                            <span className="cursor-pointer flex items-center gap-1">
                              <Camera className="h-4 w-4" />
                              📷 Camera
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing: {progress.current} / {progress.total}</span>
                      <span>{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                  </div>
                )}

                {/* Thumbnails Grid */}
                <div className="grid grid-cols-5 gap-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        item.status === 'success' && "border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]",
                        item.status === 'error' && "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]",
                        item.status === 'processing' && "border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
                        item.status === 'pending' && "border-muted"
                      )}
                    >
                      <img
                        src={item.preview}
                        alt="Supplement"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('[BULK-UPLOAD] Preview failed to load:', item.file.name);
                          // Inline SVG placeholder (matches hook)
                          (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect fill="#1a1a1a" width="100" height="100" rx="8"/>
  <text x="50" y="60" text-anchor="middle" font-size="40">💊</text>
</svg>
                          `)}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        {getStatusIcon(item)}
                      </div>
                      {!isProcessing && item.status === 'pending' && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/80 hover:bg-red-500/80 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Results List */}
              {(progress.current > 0 || items.some(i => i.status !== 'pending')) && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {items
                    .filter(i => i.status !== 'pending')
                    .map(item => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          item.status === 'success' && "bg-green-500/10 border-green-500/30",
                          item.status === 'error' && "bg-red-500/10 border-red-500/30",
                          item.status === 'processing' && "bg-blue-500/10 border-blue-500/30"
                        )}
                      >
                        {getStatusIcon(item)}
                        <div className="flex-1 min-w-0">
                          {item.status === 'success' && item.result && (
                            <>
                              <p className="font-medium truncate">
                                {item.result.name}
                              </p>
                              {item.result.brand && (
                                <p className="text-sm text-muted-foreground">
                                  {item.result.brand}
                                </p>
                              )}
                            </>
                          )}
                          {item.status === 'processing' && (
                            <p className="text-sm text-muted-foreground">Analyzing...</p>
                          )}
                          {item.status === 'error' && (
                            <>
                              <p className="text-sm font-medium text-red-400">Failed</p>
                              <p className="text-xs text-muted-foreground">{item.error}</p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
            >
              {progress.current > 0 ? 'Close' : 'Cancel'}
            </Button>
            
            {items.length > 0 && (
              <div className="flex gap-3">
                {isProcessing ? (
                  <Button
                    variant="destructive"
                    onClick={cancelProcessing}
                  >
                    Stop Processing
                  </Button>
                ) : (
                  <Button
                    onClick={startProcessing}
                    disabled={items.filter(i => i.status === 'pending').length === 0}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Processing ({items.filter(i => i.status === 'pending').length})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
