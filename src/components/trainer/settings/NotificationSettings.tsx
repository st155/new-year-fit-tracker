import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface NotificationSettingsData {
  email_enabled: boolean;
  email_integration_issues: boolean;
  email_client_alerts: boolean;
  email_daily_digest: boolean;
  digest_frequency: 'daily' | 'weekly' | 'never';
  digest_time: string;
}

export function NotificationSettings() {
  const { t } = useTranslation('trainer');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsData>({
    email_enabled: true,
    email_integration_issues: true,
    email_client_alerts: true,
    email_daily_digest: false,
    digest_frequency: 'daily',
    digest_time: '09:00:00'
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trainer_notification_settings')
        .select('*')
        .eq('trainer_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          email_enabled: data.email_enabled,
          email_integration_issues: data.email_integration_issues,
          email_client_alerts: data.email_client_alerts,
          email_daily_digest: data.email_daily_digest,
          digest_frequency: data.digest_frequency as 'daily' | 'weekly' | 'never',
          digest_time: data.digest_time
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error(t('settings.notifications.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('trainer_notification_settings')
        .upsert({
          trainer_id: user!.id,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(t('settings.notifications.saved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('settings.notifications.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">{t('settings.notifications.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('settings.notifications.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.notifications.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled" className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('settings.notifications.emailNotifications')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.emailDesc')}
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={settings.email_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, email_enabled: checked })
              }
            />
          </div>

          <Separator />

          {/* Specific Email Alerts */}
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="integration-issues" className="font-normal">
                  {t('settings.notifications.integrationIssues')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.notifications.integrationDesc')}
                </p>
              </div>
              <Switch
                id="integration-issues"
                checked={settings.email_integration_issues}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, email_integration_issues: checked })
                }
                disabled={!settings.email_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="client-alerts" className="font-normal">
                  {t('settings.notifications.clientAlerts')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.notifications.clientAlertsDesc')}
                </p>
              </div>
              <Switch
                id="client-alerts"
                checked={settings.email_client_alerts}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, email_client_alerts: checked })
                }
                disabled={!settings.email_enabled}
              />
            </div>
          </div>

          <Separator />

          {/* Daily Digest */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="daily-digest" className="font-normal">
                  {t('settings.notifications.dailyDigest')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.notifications.dailyDigestDesc')}
                </p>
              </div>
              <Switch
                id="daily-digest"
                checked={settings.email_daily_digest}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, email_daily_digest: checked })
                }
                disabled={!settings.email_enabled}
              />
            </div>

            {settings.email_daily_digest && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="digest-frequency">{t('settings.notifications.frequency')}</Label>
                  <Select
                    value={settings.digest_frequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'never') =>
                      setSettings({ ...settings, digest_frequency: value })
                    }
                  >
                    <SelectTrigger id="digest-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('settings.notifications.frequencies.daily')}</SelectItem>
                      <SelectItem value="weekly">{t('settings.notifications.frequencies.weekly')}</SelectItem>
                      <SelectItem value="never">{t('settings.notifications.frequencies.never')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="digest-time">{t('settings.notifications.sendTime')}</Label>
                  <input
                    id="digest-time"
                    type="time"
                    value={settings.digest_time}
                    onChange={(e) => 
                      setSettings({ ...settings, digest_time: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('settings.notifications.saving') : t('settings.notifications.saveSettings')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
