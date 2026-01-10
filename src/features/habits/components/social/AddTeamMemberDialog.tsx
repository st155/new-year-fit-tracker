import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, UserPlus, X, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  currentMemberCount: number;
  memberLimit: number;
  onSuccess: () => void;
}

export function AddTeamMemberDialog({
  open,
  onOpenChange,
  teamId,
  currentMemberCount,
  memberLimit,
  onSuccess,
}: AddTeamMemberDialogProps) {
  const { t } = useTranslation('habits');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Fetch current team members
  const { data: currentMembers = [] } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members' as any)
        .select('user_id')
        .eq('team_id', teamId);
      
      if (error) {
        console.error('Error fetching team members:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: open && !!teamId,
  });

  // Get member IDs safely
  const currentMemberIds = new Set(
    currentMembers.map((m: any) => m.user_id).filter(Boolean)
  );

  // Search users
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['user-search', searchQuery, currentMemberIds.size],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(10);

      // Filter out users who are already members
      return (data || []).filter((user: any) => !currentMemberIds.has(user.id));
    },
    enabled: open && searchQuery.length >= 2,
  });

  const handleAddMember = async (userId: string) => {
    if (currentMemberCount >= memberLimit) {
      toast.error(t('toast.memberLimitReached'));
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('team_members' as any)
        .insert({
          team_id: teamId,
          user_id: userId,
          role: 'member',
        });

      if (error) throw error;

      toast.success(t('toast.memberAdded'));
      setSearchQuery('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || t('toast.failedAddMember'));
    } finally {
      setIsAdding(false);
    }
  };

  const spotsLeft = memberLimit - currentMemberCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('teamDialog.inviteMember')}
          </DialogTitle>
          <DialogDescription>
            {t('teamDialog.searchDescription')}
            <Badge variant="secondary" className="ml-2">
              {t('teamDialog.spotsAvailable', { count: spotsLeft })}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('teamDialog.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isSearching ? (
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('teamDialog.searching')}</p>
              </Card>
            ) : searchQuery.length < 2 ? (
              <Card className="p-4 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('teamDialog.minChars')}
                </p>
              </Card>
            ) : searchResults.length === 0 ? (
              <Card className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('teamDialog.noUsersFound')}
                </p>
              </Card>
            ) : (
              searchResults.map((user: any) => (
                <Card key={user.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {(user.username?.[0] || user.full_name?.[0] || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {user.full_name || user.username || t('common.anonymous')}
                        </p>
                        {user.username && (
                          <p className="text-xs text-muted-foreground">
                            @{user.username}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddMember(user.id)}
                      disabled={isAdding || spotsLeft <= 0}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {t('teamDialog.add')}
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
