import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface CreatePostDialogProps {
  challengeId: string;
  onPostCreated: () => void;
}

export const CreatePostDialog = ({ challengeId, onPostCreated }: CreatePostDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('challenges');
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) {
      toast({
        title: t('errors.loadError'),
        description: t('posts.writeSmth'),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('progress-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('progress-photos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('challenge_posts')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          content: content.trim(),
          photo_url: photoUrl
        });

      if (error) throw error;

      toast({
        title: t('success', { ns: 'common', defaultValue: 'Success!' }),
        description: t('posts.publish')
      });

      setContent("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setOpen(false);
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: t('errors.loadError'),
        description: t('posts.createError'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          {t('posts.createPost')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('posts.shareProgress')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Textarea
            placeholder={t('posts.placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px]"
          />

          {photoPreview && (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full rounded-lg object-cover max-h-64"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
              >
                {t('actions.delete', { ns: 'common' })}
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              {photoFile ? t('posts.changePhoto') : t('posts.addPhoto')}
            </Button>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('posts.publishing')}
              </>
            ) : (
              t('posts.publish')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};