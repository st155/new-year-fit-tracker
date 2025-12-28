import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useClientAliases } from '@/hooks/useClientAliases';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, X, Check } from 'lucide-react';

interface TrainerClient {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

export const ClientAliasesManager = () => {
  const { t } = useTranslation('trainer');
  const { user } = useAuth();
  const { toast } = useToast();
  const { aliases, loading: aliasesLoading, saveAlias, deleteAlias, reloadAliases } = useClientAliases(user?.id);
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [newAliases, setNewAliases] = useState<Record<string, string>>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, [user?.id]);

  const loadClients = async () => {
    if (!user?.id) return;

    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);

      if (error) throw error;

      const clientsList = data
        .map(tc => tc.profiles)
        .filter(Boolean)
        .map(p => ({
          user_id: p.user_id,
          username: p.username || '',
          full_name: p.full_name || '',
          avatar_url: p.avatar_url
        }));

      setClients(clientsList);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: t('aliases.loadErrorTitle'),
        description: t('aliases.loadError'),
        variant: "destructive"
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const getClientAliases = (clientId: string) => {
    return aliases.filter(a => a.client_id === clientId);
  };

  const handleAddAlias = async (clientId: string) => {
    const aliasName = newAliases[clientId]?.trim();
    if (!aliasName || aliasName.length < 2) {
      toast({
        title: t('aliases.invalidAlias'),
        description: t('aliases.invalidAliasDesc'),
        variant: "destructive"
      });
      return;
    }

    setSavingFor(clientId);
    const success = await saveAlias(clientId, aliasName);
    
    if (success) {
      setNewAliases(prev => ({ ...prev, [clientId]: '' }));
      const client = clients.find(c => c.user_id === clientId);
      toast({
        title: t('aliases.saved'),
        description: t('aliases.savedDesc', { alias: aliasName, name: client?.full_name || t('aliases.client') }),
      });
    }
    
    setSavingFor(null);
  };

  const handleDeleteAlias = async (aliasId: string, aliasName: string) => {
    const success = await deleteAlias(aliasId);
    if (success) {
      toast({
        title: t('aliases.deleted'),
        description: t('aliases.deletedDesc', { alias: aliasName }),
      });
    }
  };

  if (loadingClients || aliasesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('aliases.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('aliases.description')}
          </p>
        </div>
        <Button variant="outline" onClick={reloadAliases}>
          {t('common:refresh')}
        </Button>
      </div>

      <div className="grid gap-4">
        {clients.map(client => {
          const clientAliases = getClientAliases(client.user_id);
          const hasAliases = clientAliases.length > 0;

          return (
            <Card key={client.user_id}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={client.avatar_url} />
                    <AvatarFallback>
                      {client.full_name?.[0]?.toUpperCase() || client.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {client.full_name}
                      {hasAliases && (
                        <Badge variant="secondary" className="ml-2">
                          <Check className="h-3 w-3 mr-1" />
                          {t('aliases.count', { count: clientAliases.length })}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>@{client.username}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Existing aliases */}
                {hasAliases && (
                  <div className="flex flex-wrap gap-2">
                    {clientAliases.map(alias => (
                      <Badge key={alias.id} variant="outline" className="pl-3 pr-1">
                        {alias.alias_name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2 hover:bg-destructive/20"
                          onClick={() => handleDeleteAlias(alias.id, alias.alias_name)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add new alias */}
                <div className="flex gap-2">
                  <Input
                    placeholder={t('aliases.placeholder')}
                    value={newAliases[client.user_id] || ''}
                    onChange={(e) => setNewAliases(prev => ({ 
                      ...prev, 
                      [client.user_id]: e.target.value 
                    }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAlias(client.user_id);
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleAddAlias(client.user_id)}
                    disabled={!newAliases[client.user_id]?.trim() || savingFor === client.user_id}
                  >
                    {savingFor === client.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        {t('common:actions.add')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {clients.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {t('aliases.noClients')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
