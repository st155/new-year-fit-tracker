import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RefreshCw, FlaskConical, Languages } from "lucide-react";
import { ProtocolTestingPanel } from "@/components/protocols/ProtocolTestingPanel";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { RecentActivity } from "@/components/profile/RecentActivity";
import { HealthSnapshot } from "@/components/profile/HealthSnapshot";
import { IntegrationStatus } from "@/components/profile/IntegrationStatus";
import { QuickSettings } from "@/components/profile/QuickSettings";
import { AccountSection } from "@/components/profile/AccountSection";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/hooks/useAuth";
import { useProfileQuery } from "@/hooks/core/useProfileQuery";
import { useProfileSummary } from "@/hooks/profile/useProfileSummary";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CleanupAppleHealthButton } from "@/components/admin/CleanupAppleHealthButton";
import { Echo11SyncCard } from "@/components/progress/Echo11SyncCard";
import { canAccessDevTools } from "@/lib/dev-access";

const ProfilePage = () => {
  const { t } = useTranslation('profile');
  const { t: tCommon } = useTranslation('common');
  const { user, signOut } = useAuth();
  const { data: contextProfile, refetch: refetchProfile } = useProfileQuery(user?.id);
  const { data: summary, isLoading: summaryLoading } = useProfileSummary();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    avatar_url: '',
    trainer_role: false
  });
  const [initialTrainerRole, setInitialTrainerRole] = useState(false);

  const [preferences, setPreferences] = useState({
    notifications: true,
    email_updates: true,
    progress_sharing: false
  });

  // Show dev tabs only for allowed users (centralized check)
  const isDev = canAccessDevTools(user?.email);

  useEffect(() => {
    fetchProfile();
  }, [user, contextProfile]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const trainerRole = data.trainer_role || false;
        setProfile({
          username: data.username || '',
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          trainer_role: trainerRole
        });
        setInitialTrainerRole(trainerRole);
        setPreferences({
          notifications: (data as any).notifications_enabled ?? true,
          email_updates: (data as any).email_updates ?? true,
          progress_sharing: (data as any).progress_sharing ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const saveProfile = async (data: { username: string; full_name: string; avatar_url: string }) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        username: data.username,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
      }));

      toast({
        title: t('updated'),
        description: t('updatedDesc'),
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: tCommon('error'),
        description: t('updateError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTrainerModeChange = async (value: boolean) => {
    if (!user) return;

    try {
      setProfile(prev => ({ ...prev, trainer_role: value }));
      
      const { error } = await supabase
        .from('profiles')
        .update({ trainer_role: value })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t('roleUpdated'),
        description: t('pageReloading'),
      });
      
      setTimeout(() => {
        window.location.href = value ? '/trainer-dashboard' : '/';
      }, 1000);
    } catch (error) {
      console.error('Error updating trainer mode:', error);
      setProfile(prev => ({ ...prev, trainer_role: !value }));
      toast({ title: tCommon('error'), description: t('roleUpdateError'), variant: 'destructive' });
    }
  };

  const updatePreference = async (key: 'notifications' | 'email_updates' | 'progress_sharing', value: boolean) => {
    if (!user) return;
    const column = key === 'notifications' ? 'notifications_enabled' : key;
    try {
      setPreferences(prev => ({ ...prev, [key]: value }));
      const { error } = await supabase
        .from('profiles')
        .update({ [column]: value } as any)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({ title: tCommon('error'), description: t('settingsError'), variant: 'destructive' });
      setPreferences(prev => ({ ...prev, [key]: !value }));
    }
  };

  const handleResetOnboarding = () => {
    if (user) {
      localStorage.removeItem(`onboarding_completed_${user.id}`);
      localStorage.removeItem(`onboarding_steps_${user.id}`);
      localStorage.removeItem(`tutorial_step_${user.id}`);
      toast({
        title: t('onboardingReset'),
        description: t('onboardingResetDesc'),
      });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getUserInitials = () => {
    const email = user?.email || "";
    const parts = email.split("@")[0].split(".");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchProfile();
      await fetchProfile();
      toast({
        title: t('refreshed'),
        description: t('refreshedDesc'),
      });
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast({
        title: tCommon('error'),
        description: t('refreshError'),
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="space-y-6">
        {/* Header */}
        <div className="px-4 py-6 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-b border-border/50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                {t('title')}
              </h1>
              <p className="text-muted-foreground">
                {t('subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {tCommon('refresh')}
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 max-w-7xl mx-auto space-y-6">
          {/* Hero Section with Avatar + Level + Actions */}
          <ProfileHero
            username={profile.username || user?.email?.split('@')[0] || 'user'}
            fullName={profile.full_name}
            avatarUrl={profile.avatar_url}
            userInitials={getUserInitials()}
            registeredAt={summary?.registeredAt}
            activeIntegrationsCount={summary?.activeIntegrationsCount}
            streakDays={summary?.streakDays}
            onSignOut={handleLogout}
            onResetOnboarding={handleResetOnboarding}
            userId={user?.id}
            trainerMode={profile.trainer_role}
            onTrainerModeChange={handleTrainerModeChange}
          />

          {/* Stats Grid */}
          <ProfileStats 
            habitsCount={summary?.habitsCount || 0}
            workoutsCount={summary?.workoutsCount || 0}
            goalsCount={summary?.goalsCount || 0}
            metricsCount={summary?.metricsCount || 0}
            streakDays={summary?.streakDays || 0}
            isLoading={summaryLoading}
          />

          {/* Health + Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HealthSnapshot 
              metrics={summary?.latestMetrics || []} 
              isLoading={summaryLoading} 
            />
            <RecentActivity 
              activities={summary?.recentActivity || []} 
              isLoading={summaryLoading} 
            />
          </div>

          {/* Integrations */}
          <IntegrationStatus 
            integrations={summary?.integrations || []} 
            isLoading={summaryLoading} 
          />

          {/* Profile Editor */}
          <ProfileEditor
            username={profile.username || user?.email?.split('@')[0] || ''}
            fullName={profile.full_name}
            avatarUrl={profile.avatar_url}
            userInitials={getUserInitials()}
            onSave={saveProfile}
            isLoading={!user}
            isSaving={loading}
          />

          {/* Quick Settings */}
          <QuickSettings
            preferences={preferences}
            trainerMode={profile.trainer_role}
            onPreferenceChange={updatePreference}
            onTrainerModeChange={handleTrainerModeChange}
          />

          {/* Account Section */}
          <AccountSection
            email={user?.email || ''}
            userId={user?.id || ''}
            onResetOnboarding={handleResetOnboarding}
            onSignOut={handleLogout}
          />

          {/* Dev Tools - Only show for devs */}
          {isDev && (
            <Card className="border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <FlaskConical className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <CardTitle>{t('devTools.title')}</CardTitle>
                    <CardDescription>
                      {t('devTools.subtitle')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link 
                  to="/dev/i18n-analyzer" 
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 border border-border/50 transition-colors"
                >
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Languages className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">i18n Analyzer</p>
                    <p className="text-xs text-muted-foreground">{t('devTools.i18nAnalyzerDesc')}</p>
                  </div>
                </Link>
                <Echo11SyncCard />
                <CleanupAppleHealthButton />
                <ProtocolTestingPanel />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
