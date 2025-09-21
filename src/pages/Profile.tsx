import { useState, useEffect } from "react";
import { Camera, Save, User, ArrowLeft, Shield, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { FitnessCard } from "@/components/ui/fitness-card";

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

  const updateProfile = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Профиль обновлен",
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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const generateAvatar = () => {
    const seed = profile.username || profile.full_name || 'default';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Заголовок */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к дашборду
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Мой профиль
          </h1>
          <p className="text-muted-foreground mt-2">
            Управляйте своими данными и настройками
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Основная информация */}
          <div className="lg:col-span-2 space-y-6">
            <FitnessCard className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Основная информация
                  </h2>
                </div>

                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage src={profile.avatar_url || generateAvatar()} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                        {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{profile.full_name || 'Имя не указано'}</h3>
                      {profile.trainer_role && (
                        <Badge variant="default" className="bg-gradient-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          Тренер
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                    <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
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
                      Email не может быть изменен
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={updateProfile} disabled={loading} className="bg-gradient-primary hover:opacity-90">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Сохранить изменения
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </FitnessCard>

            {/* Настройки */}
            <FitnessCard className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Настройки уведомлений
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-base">Push-уведомления</div>
                      <div className="text-sm text-muted-foreground">
                        Получать уведомления о новых челленджах и достижениях
                      </div>
                    </div>
                    <Switch
                      checked={preferences.notifications}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-base">Email рассылка</div>
                      <div className="text-sm text-muted-foreground">
                        Получать еженедельные отчеты о прогрессе на email
                      </div>
                    </div>
                    <Switch
                      checked={preferences.email_updates}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, email_updates: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-base">Публичный прогресс</div>
                      <div className="text-sm text-muted-foreground">
                        Делиться прогрессом с другими участниками
                      </div>
                    </div>
                    <Switch
                      checked={preferences.progress_sharing}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, progress_sharing: checked }))}
                    />
                  </div>
                </div>
              </div>
            </FitnessCard>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Статистика */}
            <FitnessCard className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Моя статистика</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Челленджей завершено</span>
                    <span className="font-semibold">3</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Активных целей</span>
                    <span className="font-semibold">10</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Дней подряд</span>
                    <span className="font-semibold">15</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Общий прогресс</span>
                    <span className="font-semibold text-success">78%</span>
                  </div>
                </div>
              </div>
            </FitnessCard>

            {/* Действия */}
            <FitnessCard className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Действия</h3>
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    Экспорт данных
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    Сменить пароль
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={handleSignOut}
                  >
                    Выйти из аккаунта
                  </Button>
                </div>
              </div>
            </FitnessCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;