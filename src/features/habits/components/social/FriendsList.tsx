import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends, useFriendRequests, useAcceptFriendRequest, useRemoveFriend } from '@/hooks/useHabitFriends';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Users, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FriendsList() {
  const { t } = useTranslation('habits');
  const { user } = useAuth();
  const { data: friends, isLoading: loadingFriends } = useFriends(user?.id);
  const { data: requests, isLoading: loadingRequests } = useFriendRequests(user?.id);
  const acceptRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">{t('friendsView.signInToView')}</p>
      </Card>
    );
  }

  const pendingCount = requests?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('friendsView.title')}</h2>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          {t('friendsView.add')}
        </Button>
      </div>

      <Tabs defaultValue="friends">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="friends">
            {t('friendsView.title')} {friends && `(${friends.length})`}
          </TabsTrigger>
          <TabsTrigger value="requests">
            {t('friendsView.requests')}
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-3 mt-4">
          {loadingFriends ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="h-20 animate-pulse" />
              ))}
            </div>
          ) : friends && friends.length > 0 ? (
            friends.map((friendship) => (
              <Card key={friendship.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friendship.friend_profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(friendship.friend_profile?.username?.[0] || 
                          friendship.friend_profile?.full_name?.[0] || 
                          '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {friendship.friend_profile?.full_name || 
                         friendship.friend_profile?.username || 
                         t('common.anonymous')}
                      </p>
                      {friendship.friend_profile?.username && (
                        <p className="text-sm text-muted-foreground">
                          @{friendship.friend_profile.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFriend.mutate(friendship.friend_id)}
                  >
                    {t('friendsView.remove')}
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('friendsView.noFriends')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('friendsView.addFriendsHint')}
              </p>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('friendsView.findFriends')}
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-3 mt-4">
          {loadingRequests ? (
            <div className="space-y-3">
              {[1].map((i) => (
                <Card key={i} className="h-20 animate-pulse" />
              ))}
            </div>
          ) : requests && requests.length > 0 ? (
            requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.friend_profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(request.friend_profile?.username?.[0] || 
                          request.friend_profile?.full_name?.[0] || 
                          '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {request.friend_profile?.full_name || 
                         request.friend_profile?.username || 
                         t('common.anonymous')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('friendsView.wantsToAdd')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => acceptRequest.mutate(request.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFriend.mutate(request.user_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('friendsView.noRequests')}</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
