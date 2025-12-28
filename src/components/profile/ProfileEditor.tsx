import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Pencil, Save, X, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface ProfileEditorProps {
  username: string;
  fullName: string;
  avatarUrl: string;
  userInitials: string;
  onSave: (data: { username: string; full_name: string; avatar_url: string }) => Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
}

export function ProfileEditor({
  username,
  fullName,
  avatarUrl,
  userInitials,
  onSave,
  isLoading,
  isSaving
}: ProfileEditorProps) {
  const { t } = useTranslation('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [editData, setEditData] = useState({
    username,
    full_name: fullName,
    avatar_url: avatarUrl
  });

  const handleStartEdit = () => {
    setEditData({ username, full_name: fullName, avatar_url: avatarUrl });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData({ username, full_name: fullName, avatar_url: avatarUrl });
    setIsEditing(false);
  };

  const handleSave = async () => {
    await onSave(editData);
    setIsEditing(false);
  };

  const handleAvatarChange = (url: string) => {
    setEditData(prev => ({ ...prev, avatar_url: url }));
    setShowAvatarUpload(false);
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            ✏️ {t('editor.title')}
          </CardTitle>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={handleStartEdit} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              {t('editor.edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
                <AvatarImage src={isEditing ? editData.avatar_url : avatarUrl} alt={username} />
                <AvatarFallback className="text-lg font-bold bg-gradient-primary text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => setShowAvatarUpload(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-3 w-3" />
                </motion.button>
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 w-full">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t('editor.username')}</label>
                        <Input
                          value={editData.username}
                          onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder={t('editor.usernamePlaceholder')}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t('editor.fullName')}</label>
                        <Input
                          value={editData.full_name}
                          onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder={t('editor.fullNamePlaceholder')}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-gradient-primary gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? t('editor.saving') : t('editor.save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        {t('editor.cancel')}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-0.5"
                  >
                    <p className="font-semibold text-lg">{fullName || username}</p>
                    <p className="text-sm text-muted-foreground">@{username}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="font-semibold mb-4">{t('editor.uploadAvatar')}</h3>
            <AvatarUpload
              currentAvatarUrl={editData.avatar_url}
              onAvatarUpdate={handleAvatarChange}
              userInitials={userInitials}
            />
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setShowAvatarUpload(false)}
            >
              {t('editor.cancel')}
            </Button>
          </motion.div>
        </div>
      )}
    </>
  );
}
