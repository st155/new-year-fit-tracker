/**
 * Notification Settings Component
 * Allows users to customize their notification preferences
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, BellOff } from 'lucide-react';

export interface NotificationPreferences {
  friend_completions: boolean;
  reactions: boolean;
  team_invites: boolean;
  achievements: boolean;
  reminders: boolean;
  quiet_mode: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  friend_completions: true,
  reactions: true,
  team_invites: true,
  achievements: true,
  reminders: true,
  quiet_mode: false,
};

export function NotificationSettings() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data?.notification_preferences) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...(data.notification_preferences as any) });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences as any })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success(t('success.saved'));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error(t('errors.saving'));
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        {preferences.quiet_mode ? (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Bell className="h-5 w-5 text-primary" />
        )}
        <h3 className="text-lg font-semibold">{t('notifications.settings.title')}</h3>
      </div>

      <div className="space-y-6">
        {/* Quiet Mode */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b">
          <div className="flex-1">
            <Label htmlFor="quiet_mode" className="text-base font-medium cursor-pointer">
              {t('notifications.settings.quietMode')}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              {t('notifications.settings.quietModeDesc')}
            </p>
          </div>
          <Switch
            id="quiet_mode"
            checked={preferences.quiet_mode}
            onCheckedChange={(checked) => updatePreference('quiet_mode', checked)}
          />
        </div>

        {/* Individual Settings */}
        <div className="space-y-4 opacity-60" style={{ opacity: preferences.quiet_mode ? 0.4 : 1 }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="friend_completions" className="font-medium cursor-pointer">
                {t('notifications.settings.friendCompletions')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('notifications.settings.friendCompletionsDesc')}
              </p>
            </div>
            <Switch
              id="friend_completions"
              checked={preferences.friend_completions}
              onCheckedChange={(checked) => updatePreference('friend_completions', checked)}
              disabled={preferences.quiet_mode}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="reactions" className="font-medium cursor-pointer">
                {t('notifications.settings.reactions')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('notifications.settings.reactionsDesc')}
              </p>
            </div>
            <Switch
              id="reactions"
              checked={preferences.reactions}
              onCheckedChange={(checked) => updatePreference('reactions', checked)}
              disabled={preferences.quiet_mode}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="team_invites" className="font-medium cursor-pointer">
                {t('notifications.settings.teamInvites')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('notifications.settings.teamInvitesDesc')}
              </p>
            </div>
            <Switch
              id="team_invites"
              checked={preferences.team_invites}
              onCheckedChange={(checked) => updatePreference('team_invites', checked)}
              disabled={preferences.quiet_mode}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="achievements" className="font-medium cursor-pointer">
                {t('notifications.settings.achievements')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('notifications.settings.achievementsDesc')}
              </p>
            </div>
            <Switch
              id="achievements"
              checked={preferences.achievements}
              onCheckedChange={(checked) => updatePreference('achievements', checked)}
              disabled={preferences.quiet_mode}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="reminders" className="font-medium cursor-pointer">
                {t('notifications.settings.reminders')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('notifications.settings.remindersDesc')}
              </p>
            </div>
            <Switch
              id="reminders"
              checked={preferences.reminders}
              onCheckedChange={(checked) => updatePreference('reminders', checked)}
              disabled={preferences.quiet_mode}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? t('notifications.settings.saving') : t('notifications.settings.saveSettings')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
