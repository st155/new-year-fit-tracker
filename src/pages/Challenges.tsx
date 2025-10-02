import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Target, Trophy, Eye, Plus, Search, Filter } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { SwipeIndicator } from "@/components/ui/swipe-indicator";
import { ChallengesListSkeleton } from "@/components/ui/universal-skeleton";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";


const Challenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<any[]>([]);
  const [userChallenges, setUserChallenges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningChallenge, setJoiningChallenge] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const routes = ['/', '/progress', '/challenges', '/feed'];
  const currentIndex = routes.indexOf(location.pathname);

  // Swipe navigation with visual feedback
  const { swipeProgress, swipeDirection } = useSwipeNavigation({
    routes,
    enabled: true,
  });

  const fetchChallenges = async () => {
    if (!user) return;

    try {
      setLoading(true);
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

  const { handleRefresh } = usePullToRefresh({
    onRefresh: async () => {
      await fetchChallenges();
    },
    successMessage: 'Challenges updated',
    showToast: false,
  });

  useEffect(() => {
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
          title: "Already Participating",
          description: "You are already participating in this challenge"
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
        title: "Success!",
        description: "You have joined the challenge"
      });
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast({
        title: "Error",
        description: "Failed to join the challenge",
        variant: "destructive"
      });
    } finally {
      setJoiningChallenge(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
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
      <div className="min-h-screen bg-background relative pb-8">
        <SwipeIndicator 
          progress={swipeProgress}
          direction={swipeDirection}
          currentIndex={currentIndex}
          totalPages={routes.length}
        />
        <div className="space-y-8 pt-6 px-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Challenges</h1>
              <p className="text-muted-foreground">Loading active challenges...</p>
            </div>
          </div>
          <ChallengesListSkeleton count={4} />
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background relative">
        <SwipeIndicator 
          progress={swipeProgress}
          direction={swipeDirection}
          currentIndex={currentIndex}
          totalPages={routes.length}
        />
        <div className="space-y-8 pb-8">
        {/* Header с градиентом */}
        <div className="px-4 py-6 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent mb-2">
                Available Challenges
              </h1>
              <p className="text-muted-foreground">
                Join fitness challenges and achieve goals together with the community
              </p>
            </div>
            
            <Button
              onClick={() => navigate('/challenges/create')}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </div>
        </div>

        <div className="px-4 space-y-6">

        {/* Поиск и фильтры */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search challenges..."
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
              <SelectItem value="all">All Challenges</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="joined">My Challenges</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredChallenges.length === 0 && challenges.length > 0 ? (
          <EmptyState
            icon={<Search className="h-16 w-16" />}
            title="Nothing Found"
            description="Try changing your search criteria or filters."
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchTerm("");
                setStatusFilter("all");
              }
            }}
          />
        ) : challenges.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-16 w-16" />}
            title="No Challenges Yet"
            description="Be the first to create a challenge! Invite friends to compete and achieve goals together."
            action={{
              label: "Create First Challenge",
              onClick: () => navigate('/challenges/create')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge, index) => {
            const isParticipant = userChallenges.includes(challenge.id);
            const daysRemaining = getDaysRemaining(challenge.end_date);
            
            // Цвета для карточек
            const cardColors = [
              { border: 'border-purple-500/30', bg: 'from-purple-500/10 to-pink-500/10', icon: 'bg-purple-500/20', text: 'text-purple-500' },
              { border: 'border-blue-500/30', bg: 'from-blue-500/10 to-cyan-500/10', icon: 'bg-blue-500/20', text: 'text-blue-500' },
              { border: 'border-green-500/30', bg: 'from-green-500/10 to-emerald-500/10', icon: 'bg-green-500/20', text: 'text-green-500' },
              { border: 'border-orange-500/30', bg: 'from-orange-500/10 to-yellow-500/10', icon: 'bg-orange-500/20', text: 'text-orange-500' },
              { border: 'border-red-500/30', bg: 'from-red-500/10 to-pink-500/10', icon: 'bg-red-500/20', text: 'text-red-500' },
            ];
            const color = cardColors[index % cardColors.length];
            
            return (
              <Card 
                key={challenge.id} 
                className={`flex flex-col animate-fade-in hover:scale-[1.02] transition-all duration-300 border-2 ${color.border} bg-gradient-to-br ${color.bg} shadow-lg`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-foreground mb-2">
                        {challenge.title}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {challenge.description}
                      </CardDescription>
                    </div>
                    <div className={`p-3 ${color.icon} rounded-xl ml-3`}>
                      <Trophy className={`h-6 w-6 ${color.text}`} />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`p-1.5 ${color.icon} rounded-lg`}>
                      <Calendar className={`h-4 w-4 ${color.text}`} />
                    </div>
                    <span className="text-muted-foreground">
                      {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`p-1.5 ${color.icon} rounded-lg`}>
                      <Target className={`h-4 w-4 ${color.text}`} />
                    </div>
                    <span className={`font-semibold ${color.text}`}>
                      Days left: {daysRemaining}
                    </span>
                  </div>
                  
                  {isParticipant && (
                    <Badge variant="default" className={`w-fit ${color.icon} ${color.text} border-0`}>
                      <Users className="h-3 w-3 mr-1" />
                      Participating
                    </Badge>
                  )}
                </CardContent>
                
                <CardFooter className="flex gap-2">
                  <Button 
                    onClick={() => navigate(`/challenges/${challenge.id}`)}
                    variant="outline"
                    className={`flex-1 ${color.text} border-current hover:bg-current/10`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                  
                  {isParticipant ? (
                    <Button disabled className="flex-1 bg-muted">
                      Already Participating
                    </Button>
                  ) : (
                    <Button
                      onClick={() => joinChallenge(challenge.id)}
                      disabled={joiningChallenge === challenge.id}
                      className={`flex-1 bg-gradient-to-r ${color.bg.includes('purple') ? 'from-purple-500 to-pink-500' : color.bg.includes('blue') ? 'from-blue-500 to-cyan-500' : color.bg.includes('green') ? 'from-green-500 to-emerald-500' : color.bg.includes('orange') ? 'from-orange-500 to-yellow-500' : 'from-red-500 to-pink-500'} text-white hover:opacity-90`}
                    >
                      {joiningChallenge === challenge.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        'Join'
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
              No Available Challenges
            </h3>
            <p className="text-muted-foreground">
              There are no active challenges at the moment. Check back later!
            </p>
          </div>
        )}
        </div>
      </div>
      </div>
    </PullToRefresh>
  );
};

export default Challenges;