import { useState, useEffect } from "react";
import { Save, User, Shield, Bell, Mail, Share, Settings, RefreshCw } from "lucide-react";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { RecentActivity } from "@/components/profile/RecentActivity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { profile: contextProfile, refetch: refetchProfile } = useProfile();
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
        // Load preferences from profile columns (with fallbacks)
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

  const saveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const roleChanged = profile.trainer_role !== initialTrainerRole;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          trainer_role: profile.trainer_role
        })
        .eq('user_id', user.id);

      if (error) throw error;

      if (roleChanged) {
        toast({
          title: "Роль обновлена",
          description: "Страница будет перезагружена для применения изменений...",
        });
        
        setTimeout(() => {
          window.location.href = profile.trainer_role ? '/trainer-dashboard' : '/';
        }, 1500);
      } else {
        toast({
          title: "Profile updated",
          description: "Your data has been successfully saved",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
      setPreferences(prev => ({ ...prev, [key]: !value }));
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
        title: "Обновлено",
        description: "Профиль успешно обновлен",
      });
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить профиль",
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
                Профиль
              </h1>
              <p className="text-muted-foreground">
                Управляйте своими данными и настройками
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </div>

        <div className="px-4 max-w-7xl mx-auto space-y-6">
          {/* Hero Section with Avatar + Level */}
          <ProfileHero
            username={profile.username || user?.email?.split('@')[0] || 'user'}
            fullName={profile.full_name}
            avatarUrl={profile.avatar_url}
            userInitials={getUserInitials()}
          />

          {/* Stats Grid */}
          <ProfileStats />

          {/* Recent Activity */}
          <RecentActivity />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Основная информация */}
            <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 shadow-glow-secondary">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-secondary rounded-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>
                        Update your personal details
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="user-id">User ID</Label>
                    <Input
                      id="user-id"
                      value={user?.id || ''}
                      disabled
                      className="bg-muted font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your unique user identifier
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed after registration
                    </p>
                  </div>

                  <div className="p-4 border-2 border-primary/30 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5">
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="trainer-mode"
                        checked={profile.trainer_role}
                        onCheckedChange={(checked) => setProfile(prev => ({ ...prev, trainer_role: checked }))}
                      />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="trainer-mode" className="text-base font-semibold flex items-center gap-2">
                          🎯 Trainer Mode
                          {profile.trainer_role && (
                            <Badge variant="default" className="bg-gradient-primary">
                              Active
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {profile.trainer_role 
                            ? "Access to client management, training plans, and analytics"
                            : "Enable to unlock professional trainer features and tools"
                          }
                        </p>
                      </div>
                    </div>
                    {profile.trainer_role !== initialTrainerRole && (
                      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                          ⚠️ Click "Save Changes" to apply trainer role activation
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={saveProfile} disabled={loading} className="bg-gradient-primary hover:opacity-90 shadow-lg">
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>
                        Configure how you want to receive notifications
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications in browser
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications}
                      onCheckedChange={(checked) => updatePreference('notifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive news and updates via email
                      </p>
                    </div>
                    <Switch
                      checked={preferences.email_updates}
                      onCheckedChange={(checked) => updatePreference('email_updates', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                      <Share className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Privacy</CardTitle>
                      <CardDescription>
                        Manage the visibility of your data
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Public Progress</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow others to see your progress
                      </p>
                    </div>
                    <Switch
                      checked={preferences.progress_sharing}
                      onCheckedChange={(checked) => updatePreference('progress_sharing', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-2 border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                      <CardTitle>Account Security</CardTitle>
                      <CardDescription>
                        Manage your account security
                      </CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Email: {user?.email}</p>
                      <p className="text-sm text-muted-foreground">Confirmed</p>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Active
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-medium text-yellow-600 mb-2">Reset Onboarding</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Restart the onboarding tutorial to see the getting started guide again.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (user) {
                          localStorage.removeItem(`onboarding_completed_${user.id}`);
                          localStorage.removeItem(`onboarding_steps_${user.id}`);
                          localStorage.removeItem(`tutorial_step_${user.id}`);
                          toast({
                            title: "Onboarding Reset",
                            description: "Reload the page to see the tutorial again",
                          });
                          setTimeout(() => window.location.reload(), 1000);
                        }
                      }}
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Reset Onboarding Tutorial
                    </Button>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-destructive">
                    <h4 className="font-medium text-destructive mb-2">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Signing out will remove the session on this device.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleLogout}
                      className="w-full"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;