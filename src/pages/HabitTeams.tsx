import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useHabitTeams, usePublicTeams, useJoinTeam } from '@/hooks/useHabitTeams';
import { TeamCard } from '@/features/habits/components/social/TeamCard';
import { CreateTeamDialog } from '@/features/habits/components/social/CreateTeamDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function HabitTeams() {
  const { t } = useTranslation('habitTeams');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: myTeams, isLoading: loadingMyTeams } = useHabitTeams(user?.id);
  const { data: publicTeams, isLoading: loadingPublic } = usePublicTeams();
  const joinTeam = useJoinTeam();

  const handleJoinTeam = async (teamId: string) => {
    try {
      await joinTeam.mutateAsync(teamId);
      toast.success(t('toast.joinSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('toast.joinError'));
    }
  };

  const handleViewTeam = (teamId: string) => {
    navigate(`/habits-v3/teams/${teamId}`);
  };

  const myTeamIds = new Set(myTeams?.map(t => t.id) || []);

  const filteredPublicTeams = publicTeams?.filter(
    (team) =>
      !myTeamIds.has(team.id) &&
      (team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">{t('loginRequired.title')}</h2>
            <p className="text-muted-foreground">
              {t('loginRequired.subtitle')}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/habits-v3')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t('header.title')}</h1>
              <p className="text-muted-foreground">{t('header.subtitle')}</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createTeam')}
          </Button>
        </div>

        <Tabs defaultValue="my" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my">
              {t('tabs.myTeams')} {myTeams && `(${myTeams.length})`}
            </TabsTrigger>
            <TabsTrigger value="public">{t('tabs.publicTeams')}</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-3">
            {loadingMyTeams ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="h-32 animate-pulse" />
                ))}
              </div>
            ) : myTeams && myTeams.length > 0 ? (
              myTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isJoined
                  onView={() => handleViewTeam(team.id)}
                />
              ))
            ) : (
              <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">{t('emptyMyTeams.title')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t('emptyMyTeams.subtitle')}
                </p>
                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                  <Button size="lg" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-5 w-5 mr-2" />
                    {t('createTeam')}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t('emptyMyTeams.hint')}
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="public" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingPublic ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-32 animate-pulse" />
                ))}
              </div>
            ) : filteredPublicTeams && filteredPublicTeams.length > 0 ? (
              filteredPublicTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onJoin={() => handleJoinTeam(team.id)}
                />
              ))
            ) : (
              <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? t('emptyPublicTeams.notFound') : t('emptyPublicTeams.noTeams')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? t('emptyPublicTeams.notFoundHint')
                    : t('emptyPublicTeams.noTeamsHint')}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('emptyPublicTeams.createPublic')}
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <CreateTeamDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </div>
  );
}
