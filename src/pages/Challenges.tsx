import { useAuth } from "@/hooks/useAuth";
import { useChallenges } from "@/hooks/useChallenges";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy, Target, Users, TrendingUp, Sparkles, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Challenges() {
  const { user } = useAuth();
  const { challenges, isLoading } = useChallenges(user?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Показать приветственное модальное окно для новых пользователей
  useEffect(() => {
    if (isOnboarding && user) {
      setShowWelcomeModal(true);
    }
  }, [isOnboarding, user]);

  const activeCount = challenges?.length || 0;
  const participatingCount = challenges?.filter(c => c.isParticipant).length || 0;

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const handleSkipOnboarding = () => {
    setShowWelcomeModal(false);
    navigate('/integrations?onboarding=true');
  };

  const handleContinue = () => {
    setShowWelcomeModal(false);
  };

  return (
    <>
      {/* Welcome Modal for New Users */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-primary">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl">Добро пожаловать в Elite10! 🎉</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              Присоединяйтесь к челленджу и начните свой путь к идеальной форме. 
              Выберите челлендж, который вам нравится, и мы создадим для вас персональные цели.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleSkipOnboarding}>
              Пропустить
            </Button>
            <Button onClick={handleContinue} className="gap-2">
              <Trophy className="h-4 w-4" />
              Выбрать челлендж
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container py-6 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 md:p-12">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">Challenges</h1>
              <p className="text-white/90 text-lg">Push your limits and achieve greatness</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Target className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">{activeCount}</p>
                  <p className="text-sm text-white/80">Active Challenges</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">{participatingCount}</p>
                  <p className="text-sm text-white/80">Your Challenges</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">9</p>
                  <p className="text-sm text-white/80">Goals per Challenge</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Challenges Grid */}
      {!challenges || challenges.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="No active challenges"
          description="Check back later for new challenges or create your own"
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Available Challenges</h2>
            <p className="text-muted-foreground">Choose a challenge and start your journey</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-fade-in">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
