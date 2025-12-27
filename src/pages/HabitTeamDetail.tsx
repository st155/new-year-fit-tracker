import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useHabitTeams, useTeamMembers, useLeaveTeam } from '@/hooks/useHabitTeams';
import { useHabitFeed } from '@/hooks/useHabitFeed';
import { FeedEvent } from '@/features/habits/components/social/FeedEvent';
import { AddTeamMemberDialog } from '@/features/habits/components/social/AddTeamMemberDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, LogOut, Crown, Globe, Lock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function HabitTeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation('habitTeamDetail');
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  const { data: myTeams } = useHabitTeams(user?.id);
  const { data: members, refetch: refetchMembers } = useTeamMembers(id);
  const { data: feedEvents } = useHabitFeed(id);
  const leaveTeam = useLeaveTeam();

  const team = myTeams?.find((t) => t.id === id);
  const membersList = members || [];
  const currentMember = membersList?.find((m) => m.user_id === user?.id);
  const isOwner = currentMember?.role === 'owner';
  const currentMemberCount = team?.member_count || membersList.length;
  const canAddMembers = isOwner && currentMemberCount < (team?.member_limit || 10);

  const handleLeaveTeam = async () => {
    if (!id) return;
    
    if (isOwner) {
      toast.error(t('ownerCantLeave'));
      return;
    }

    try {
      await leaveTeam.mutateAsync(id);
      toast.success(t('leftTeam'));
      navigate('/habits-v3/teams');
    } catch (error: any) {
      toast.error(error.message || t('leaveError'));
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">{t('teamNotFound')}</h2>
            <Button onClick={() => navigate('/habits-v3/teams')}>
              {t('backToList')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/habits-v3/teams')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">{team.name}</h1>
                {team.is_public ? (
                  <Globe className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              {team.description && (
                <p className="text-muted-foreground">{team.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {team.member_count || 0} / {team.member_limit} {t('participants')}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {canAddMembers && (
              <Button onClick={() => setShowAddMemberDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('invite')}
              </Button>
            )}
            {!isOwner && (
              <Button variant="destructive" onClick={handleLeaveTeam}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('leave')}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="feed" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="feed">{t('tabs.activity')}</TabsTrigger>
            <TabsTrigger value="members">
              {t('tabs.members')} ({membersList.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-3">
            {feedEvents && feedEvents.length > 0 ? (
              feedEvents.map((event) => (
                <FeedEvent key={event.id} event={event} />
              ))
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('noActivity')}</h3>
                <p className="text-muted-foreground">
                  {t('startHabitsPrompt')}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-3">
            {membersList.length > 0 ? (
              <div className="grid gap-3">
                {membersList.map((member) => (
                  <Card key={member.user_id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {(member.profiles?.username?.[0] || 
                              member.profiles?.full_name?.[0] || 
                              '?').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {member.profiles?.full_name || 
                               member.profiles?.username || 
                               t('anonymous')}
                            </p>
                            {member.role === 'owner' && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          {member.profiles?.username && (
                            <p className="text-sm text-muted-foreground">
                              @{member.profiles.username}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role === 'owner' ? t('roles.owner') : t('roles.member')}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t('noMembers')}</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Member Dialog */}
        <AddTeamMemberDialog
          open={showAddMemberDialog}
          onOpenChange={setShowAddMemberDialog}
          teamId={id || ''}
          currentMemberCount={currentMemberCount}
          memberLimit={team?.member_limit || 10}
          onSuccess={() => {
            refetchMembers();
            queryClient.invalidateQueries({ queryKey: ['habit-teams'] });
          }}
        />
      </div>
    </div>
  );
}