import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Link2, Loader2, Image as ImageIcon, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WgerExerciseImage {
  id: number;
  image: string;
  is_main: boolean;
  name?: string;
}

interface AddExerciseImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  onImageSelect: (imageUrl: string) => void;
}

export default function AddExerciseImageDialog({
  open,
  onOpenChange,
  exerciseName,
  onImageSelect,
}: AddExerciseImageDialogProps) {
  const { t } = useTranslation('workouts');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState(exerciseName);
  const [searchResults, setSearchResults] = useState<WgerExerciseImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const searchWger = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Use Search API for proper exercise search with images
      const response = await fetch(
        `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(searchTerm)}&language=2`
      );
      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        // Transform results to our format - only include those with images
        const images: WgerExerciseImage[] = data.suggestions
          .filter((item: any) => item.data?.image)
          .map((item: any) => ({
            id: item.data.id,
            image: item.data.image.startsWith('http') 
              ? item.data.image 
              : `https://wger.de${item.data.image}`,
            is_main: true,
            name: item.data.name,
          }));
        
        setSearchResults(images);
      }
    } catch (error) {
      console.error('Error searching Wger:', error);
      toast({
        title: t('imageDialog.searchError'),
        description: t('imageDialog.searchErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Автоматический поиск при открытии диалога
  const hasSearchedRef = useRef(false);
  
  useEffect(() => {
    if (open && exerciseName && activeTab === 'search' && !hasSearchedRef.current) {
      hasSearchedRef.current = true;
      setSearchQuery(exerciseName);
      searchWger(exerciseName);
    }
    
    if (!open) {
      hasSearchedRef.current = false;
    }
  }, [open, exerciseName, activeTab]);

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    // Basic URL validation
    try {
      new URL(urlInput);
      setPreviewUrl(urlInput);
    } catch {
      toast({
        title: t('imageDialog.invalidUrl'),
        description: t('imageDialog.invalidUrlDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleConfirm = () => {
    const finalUrl = selectedImage || previewUrl;
    if (finalUrl) {
      onImageSelect(finalUrl);
      onOpenChange(false);
      resetState();
    }
  };

  const resetState = () => {
    setSearchResults([]);
    setSelectedImage(null);
    setPreviewUrl(null);
    setUrlInput('');
    setSearchQuery(exerciseName);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {t('imageDialog.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          {t('imageDialog.exercise')}: <span className="font-medium text-foreground">{exerciseName}</span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              {t('imageDialog.search')}
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="w-4 h-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={t('imageDialog.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchWger()}
              />
              <Button onClick={() => searchWger()} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedImage(result.image)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                      selectedImage === result.image
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/30'
                    )}
                  >
                    <img
                      src={result.image}
                      alt="Exercise"
                      className="w-full h-full object-cover"
                    />
                    {selectedImage === result.image && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!isSearching && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('imageDialog.hint')}</p>
                <p className="text-xs mt-1">{t('imageDialog.hintAlt')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label>{t('imageDialog.urlLabel')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
                <Button onClick={handleUrlSubmit} variant="secondary">
                  {t('imageDialog.load')}
                </Button>
              </div>
            </div>

            {previewUrl && (
              <div className="space-y-2">
                <Label>{t('imageDialog.preview')}</Label>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={() => {
                      setPreviewUrl(null);
                      toast({
                        title: t('imageDialog.loadError'),
                        description: t('imageDialog.loadErrorDesc'),
                        variant: 'destructive',
                      });
                    }}
                  />
                  <button
                    onClick={() => setPreviewUrl(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t('common:cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedImage && !previewUrl}
          >
            {t('common:save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
