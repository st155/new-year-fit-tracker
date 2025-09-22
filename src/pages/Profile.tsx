import { useState, useEffect } from "react";
import { Camera, Save, User, ArrowLeft, Shield, Bell, Mail, Share, Settings } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    avatar_url: '',
    trainer_role: false
  });

  const [preferences, setPreferences] = useState({
    notifications: true,
    email_updates: true,
    progress_sharing: false
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

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
        setProfile({
          username: data.username || '',
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          trainer_role: data.trainer_role || false
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

      toast({
        title: "Профиль обновлен",
        description: "Ваши данные успешно сохранены",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить профиль",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Профиль
          </h1>
          <p className="text-muted-foreground mt-2">
            Управляйте своими данными и настройками аккаунта
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Настройки
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Безопасность
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Аватар */}
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">Фото профиля</CardTitle>
                  <CardDescription>
                    Загрузите свое фото или выберите аватар
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <AvatarUpload
                    currentAvatarUrl={profile.avatar_url}
                    onAvatarUpdate={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))}
                    userInitials={getUserInitials()}
                  />
                </CardContent>
              </Card>

              {/* Основная информация */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Основная информация
                  </CardTitle>
                  <CardDescription>
                    Обновите свои личные данные
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Имя пользователя</Label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Введите имя пользователя"
                      />
                    </div>
                    <div>
                      <Label htmlFor="full_name">Полное имя</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Введите полное имя"
                      />
                    </div>
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
                      Email нельзя изменить после регистрации
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="trainer-mode"
                      checked={profile.trainer_role}
                      onCheckedChange={(checked) => setProfile(prev => ({ ...prev, trainer_role: checked }))}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="trainer-mode" className="text-sm font-medium">
                        Режим тренера
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Включите для доступа к функциям управления клиентами
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={saveProfile} disabled={loading} className="bg-gradient-primary hover:opacity-90">
                      {loading ? "Сохранение..." : "Сохранить изменения"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Уведомления
                  </CardTitle>
                  <CardDescription>
                    Настройте как вы хотите получать уведомления
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push уведомления</Label>
                      <p className="text-xs text-muted-foreground">
                        Получать уведомления в браузере
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, notifications: checked }))}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email уведомления</Label>
                      <p className="text-xs text-muted-foreground">
                        Получать новости и обновления на email
                      </p>
                    </div>
                    <Switch
                      checked={preferences.email_updates}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, email_updates: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share className="h-5 w-5 text-primary" />
                    Приватность
                  </CardTitle>
                  <CardDescription>
                    Управляйте видимостью ваших данных
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Публичный прогресс</Label>
                      <p className="text-xs text-muted-foreground">
                        Разрешить другим видеть ваш прогресс
                      </p>
                    </div>
                    <Switch
                      checked={preferences.progress_sharing}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, progress_sharing: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Безопасность аккаунта
                </CardTitle>
                <CardDescription>
                  Управляйте безопасностью вашего аккаунта
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Email: {user?.email}</p>
                      <p className="text-sm text-muted-foreground">Подтвержден</p>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Активен
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-destructive">
                    <h4 className="font-medium text-destructive mb-2">Опасная зона</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Выход из аккаунта удалит сессию на этом устройстве.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleLogout}
                      className="w-full"
                    >
                      Выйти из аккаунта
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;