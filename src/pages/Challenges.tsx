import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useChallengesQuery } from "@/features/challenges";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { Trophy, Target, Users, TrendingUp, Sparkles, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateChallengeDialog } from "@/components/trainer/CreateChallengeDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyStateV3 } from "@/components/ui/empty-state-v3";

export default function Challenges() {
  const { t } = useTranslation('challenges');
  const { user } = useAuth();
  const { challenges, isLoading, error, refetch } = useChallengesQuery(user?.id);
  
  console.log('🏆 [Challenges Page] Render:', {
    userId: user?.id,
    challengesCount: challenges?.length,
    isLoading,
    error: error?.message
  });
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'active' | 'completed'>('all');

  // Показать приветственное модальное окно для новых пользователей
  useEffect(() => {
    if (isOnboarding && user) {
      setShowWelcomeModal(true);
    }
  }, [isOnboarding, user]);

  const activeCount = challenges?.length || 0;
  const participatingCount = challenges?.filter(c => c.isParticipant).length || 0;

  // Filter challenges
  const filteredChallenges = challenges?.filter(challenge => {
    if (filter === 'mine') return challenge.isParticipant;
    if (filter === 'active') {
      const endDate = new Date(challenge.end_date);
      return endDate.getTime() > new Date().getTime();
    }
    if (filter === 'completed') {
      const endDate = new Date(challenge.end_date);
      return endDate.getTime() <= new Date().getTime();
    }
    return true;
  }) || [];

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
    <AnimatedPage>
      {/* Welcome Modal for New Users */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-primary">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl">{t('welcomeTitle')}</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              {t('welcomeDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleSkipOnboarding}>
              {t('skip')}
            </Button>
            <Button onClick={handleContinue} className="gap-2">
              <Trophy className="h-4 w-4" />
              {t('chooseChallenge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container py-6 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 md:p-12">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white">{t('title')}</h1>
                <p className="text-white/90 text-lg">{t('subtitle')}</p>
              </div>
            </div>
            {user && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-white text-primary hover:bg-white/90 shadow-lg shrink-0"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t('create')}
              </Button>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Target className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">{activeCount}</p>
                  <p className="text-sm text-white/80">{t('activeChallenges')}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">{participatingCount}</p>
                  <p className="text-sm text-white/80">{t('yourChallenges')}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">9</p>
                  <p className="text-sm text-white/80">{t('goalsPerChallenge')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Challenges Grid */}
      {error ? (
        <EmptyStateV3
          variant="default"
          title={t('errors.loadError')}
          description={error.message || t('errors.loadErrorDescription')}
          illustration="animated-icon"
          action={{
            label: t('refresh'),
            onClick: () => refetch(),
            icon: Trophy
          }}
        />
      ) : !challenges || challenges.length === 0 ? (
        <EmptyStateV3
          variant="challenges"
          title={t('empty.noActiveChallenges')}
          description={t('empty.noActiveChallengesDescription')}
          illustration="animated-icon"
          action={{
            label: t('empty.createChallenge'),
            onClick: () => setShowCreateDialog(true),
            icon: Plus
          }}
          secondaryAction={{
            label: t('refresh'),
            onClick: () => refetch()
          }}
          motivationalQuote={t('empty.motivationalQuote')}
        />
      ) : filteredChallenges.length === 0 ? (
        <EmptyStateV3
          variant="search"
          title={t('empty.noChallengesInCategory')}
          description={t('empty.noChallengesInCategoryDescription')}
          illustration="animated-icon"
          action={{
            label: t('empty.resetFilter'),
            onClick: () => setFilter('all'),
            icon: Target
          }}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('availableChallenges')}</h2>
              <p className="text-muted-foreground">{t('availableDescription')}</p>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">{t('filters.all')}</TabsTrigger>
                <TabsTrigger value="mine">{t('filters.mine')}</TabsTrigger>
                <TabsTrigger value="active">{t('filters.active')}</TabsTrigger>
                <TabsTrigger value="completed">{t('filters.completed')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {filteredChallenges.map((challenge) => (
              <motion.div key={challenge.id} variants={staggerItem}>
                <ChallengeCard challenge={challenge} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Create Challenge Dialog */}
      <CreateChallengeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />
      </div>
    </AnimatedPage>
  );
}
