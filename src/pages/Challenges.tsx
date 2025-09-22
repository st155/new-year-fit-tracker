import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Target, Trophy, Eye, Plus, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";


const Challenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<any[]>([]);
  const [userChallenges, setUserChallenges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningChallenge, setJoiningChallenge] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchChallenges = async () => {
      if (!user) return;

      try {
        // Загружаем все активные челленджи
        const { data: challengesData } = await supabase
          .from('challenges')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        setChallenges(challengesData || []);
        setFilteredChallenges(challengesData || []);

        // Загружаем челленджи пользователя
        const { data: participantData } = await supabase
          .from('challenge_participants')
          .select('challenge_id')
          .eq('user_id', user.id);

        setUserChallenges(participantData?.map(p => p.challenge_id) || []);
      } catch (error) {
        console.error('Error fetching challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [user]);

  // Фильтрация и поиск
  useEffect(() => {
    let filtered = challenges;

    // Поиск по названию и описанию
    if (searchTerm) {
      filtered = filtered.filter(challenge => 
        challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Фильтр по статусу участия
    if (statusFilter === "joined") {
      filtered = filtered.filter(challenge => userChallenges.includes(challenge.id));
    } else if (statusFilter === "available") {
      filtered = filtered.filter(challenge => !userChallenges.includes(challenge.id));
    }

    setFilteredChallenges(filtered);
  }, [challenges, searchTerm, statusFilter, userChallenges]);

  const joinChallenge = async (challengeId: string) => {
    if (!user) return;

    setJoiningChallenge(challengeId);

    try {
      // Сначала проверяем, не участвует ли пользователь уже в этом челлендже
      const { data: existingParticipation } = await supabase
        .from('challenge_participants')
        .select('id')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .single();

      if (existingParticipation) {
        // Пользователь уже участвует, обновляем состояние
        setUserChallenges(prev => {
          if (!prev.includes(challengeId)) {
            return [...prev, challengeId];
          }
          return prev;
        });
        
        toast({
          title: "Уже участвуете",
          description: "Вы уже участвуете в этом челлендже"
        });
        return;
      }

      // Если не участвует, добавляем
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          user_id: user.id,
          challenge_id: challengeId
        });

      if (error) throw error;

      setUserChallenges(prev => [...prev, challengeId]);
      
      toast({
        title: "Успешно!",
        description: "Вы присоединились к челленджу"
      });
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось присоединиться к челленджу",
        variant: "destructive"
      });
    } finally {
      setJoiningChallenge(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    // Устанавливаем время конца дня
    end.setHours(23, 59, 59, 999);
    
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Доступные челленджи
            </h1>
            <p className="text-muted-foreground">
              Присоединяйтесь к фитнес-вызовам и достигайте целей вместе с сообществом
            </p>
          </div>
          
          <Button
            onClick={() => navigate('/challenges/create')}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать челлендж
          </Button>
        </div>

        {/* Поиск и фильтры */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск челленджей..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все челленджи</SelectItem>
              <SelectItem value="available">Доступные</SelectItem>
              <SelectItem value="joined">Мои челленджи</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredChallenges.length === 0 && challenges.length > 0 ? (
          <EmptyState
            icon={<Search className="h-16 w-16" />}
            title="Ничего не найдено"
            description="Попробуйте изменить критерии поиска или фильтры."
            action={{
              label: "Очистить фильтры",
              onClick: () => {
                setSearchTerm("");
                setStatusFilter("all");
              }
            }}
          />
        ) : challenges.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-16 w-16" />}
            title="Пока нет челленджей"
            description="Станьте первым, кто создаст челлендж! Приглашайте друзей к соревнованиям и достигайте целей вместе."
            action={{
              label: "Создать первый челлендж",
              onClick: () => navigate('/challenges/create')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge, index) => {
            const isParticipant = userChallenges.includes(challenge.id);
            const daysRemaining = getDaysRemaining(challenge.end_date);
            
            return (
              <Card 
                key={challenge.id} 
                className="flex flex-col animate-fade-in hover-scale transition-all duration-300" 
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl text-foreground">
                      {challenge.title}
                    </CardTitle>
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <CardDescription className="text-muted-foreground">
                    {challenge.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>Осталось дней: {daysRemaining}</span>
                  </div>
                  
                  {isParticipant && (
                    <Badge variant="secondary" className="w-fit">
                      <Users className="h-3 w-3 mr-1" />
                      Участвую
                    </Badge>
                  )}
                </CardContent>
                
                <CardFooter className="flex gap-2">
                  <Button 
                    onClick={() => navigate(`/challenges/${challenge.id}`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Подробнее
                  </Button>
                  
                  {isParticipant ? (
                    <Button disabled className="flex-1">
                      Уже участвую
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => joinChallenge(challenge.id)}
                      disabled={joiningChallenge === challenge.id}
                      className="flex-1"
                    >
                      {joiningChallenge === challenge.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Присоединяюсь...
                        </>
                      ) : (
                        'Присоединиться'
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
          </div>
        )}

        {challenges.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Нет доступных челленджей
            </h3>
            <p className="text-muted-foreground">
              В данный момент нет активных челленджей. Загляните позже!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Challenges;