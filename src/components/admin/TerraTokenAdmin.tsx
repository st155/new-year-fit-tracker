import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  Search,
  CheckCircle2,
  XCircle,
  User,
  AlertTriangle,
  History,
  Skull,
  Unplug,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  useTerraTokens,
  useUsersList,
  useCreateTerraToken,
  useUpdateTerraToken,
  useDeleteTerraToken,
  useRequestHistoricalData,
  useGetTerraUsers,
  useDeauthTerraUser,
  useDeauthAllTerraUsers,
  TerraApiUser
} from '@/hooks/admin/useTerraTokenAdmin';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PROVIDERS = [
  { value: 'WHOOP', label: 'Whoop' },
  { value: 'GARMIN', label: 'Garmin' },
  { value: 'OURA', label: 'Oura' },
  { value: 'WITHINGS', label: 'Withings' },
  { value: 'FITBIT', label: 'Fitbit' },
  { value: 'POLAR', label: 'Polar' },
  { value: 'APPLE', label: 'Apple Health' },
];

export function TerraTokenAdmin() {
  const { data: tokens, isLoading, refetch } = useTerraTokens();
  const { data: users } = useUsersList();
  const createToken = useCreateTerraToken();
  const updateToken = useUpdateTerraToken();
  const deleteToken = useDeleteTerraToken();
  const requestHistorical = useRequestHistoricalData();
  const getTerraUsers = useGetTerraUsers();
  const deauthTerraUser = useDeauthTerraUser();
  const deauthAllTerraUsers = useDeauthAllTerraUsers();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDead, setFilterDead] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTerraUsersDialog, setShowTerraUsersDialog] = useState(false);
  const [selectedToken, setSelectedToken] = useState<typeof tokens extends (infer T)[] ? T : never | null>(null);
  const [requestingHistorical, setRequestingHistorical] = useState<string | null>(null);
  
  // Terra API users state
  const [terraApiUsers, setTerraApiUsers] = useState<TerraApiUser[]>([]);
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);
  const [inspectingUserName, setInspectingUserName] = useState<string>('');
  
  // Orphan cleanup state
  const [selectedOrphanUserId, setSelectedOrphanUserId] = useState<string>('');
  const [orphanSearchQuery, setOrphanSearchQuery] = useState('');

  // Create form state
  const [newUserId, setNewUserId] = useState('');
  const [newTerraUserId, setNewTerraUserId] = useState('');
  const [newProvider, setNewProvider] = useState('WHOOP');

  // Edit form state
  const [editTerraUserId, setEditTerraUserId] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Count dead tokens
  const deadTokensCount = tokens?.filter(t => t.is_dead).length || 0;

  const filteredTokens = tokens?.filter(token => {
    if (filterDead && !token.is_dead) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      token.profile?.full_name?.toLowerCase().includes(query) ||
      token.terra_user_id?.toLowerCase().includes(query) ||
      token.provider.toLowerCase().includes(query) ||
      token.user_id.toLowerCase().includes(query)
    );
  });

  const filteredUsers = users?.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.user_id.toLowerCase().includes(query)
    );
  });

  const handleCreate = async () => {
    if (!newUserId || !newTerraUserId || !newProvider) return;
    
    await createToken.mutateAsync({
      user_id: newUserId,
      terra_user_id: newTerraUserId,
      provider: newProvider
    });
    
    setShowCreateDialog(false);
    setNewUserId('');
    setNewTerraUserId('');
    setNewProvider('WHOOP');
  };

  const handleEdit = async () => {
    if (!selectedToken) return;
    
    await updateToken.mutateAsync({
      id: selectedToken.id,
      terra_user_id: editTerraUserId,
      provider: editProvider,
      is_active: editIsActive
    });
    
    setShowEditDialog(false);
    setSelectedToken(null);
  };

  const handleDelete = async () => {
    if (!selectedToken) return;
    
    await deleteToken.mutateAsync(selectedToken.id);
    
    setShowDeleteDialog(false);
    setSelectedToken(null);
  };

  const openEditDialog = (token: NonNullable<typeof tokens>[0]) => {
    setSelectedToken(token);
    setEditTerraUserId(token.terra_user_id || '');
    setEditProvider(token.provider);
    setEditIsActive(token.is_active);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (token: NonNullable<typeof tokens>[0]) => {
    setSelectedToken(token);
    setShowDeleteDialog(true);
  };

  const handleRequestHistorical = async (token: NonNullable<typeof tokens>[0]) => {
    if (!token.terra_user_id) return;
    setRequestingHistorical(token.id);
    try {
      await requestHistorical.mutateAsync({ terra_user_id: token.terra_user_id, days: 30 });
    } finally {
      setRequestingHistorical(null);
    }
  };

  // Inspect Terra API users for a specific user
  const handleInspectTerraUsers = async (token: NonNullable<typeof tokens>[0]) => {
    setInspectingUserId(token.user_id);
    setInspectingUserName(token.profile?.full_name || token.user_id.substring(0, 8));
    setTerraApiUsers([]);
    setShowTerraUsersDialog(true);
    
    try {
      const result = await getTerraUsers.mutateAsync(token.user_id);
      setTerraApiUsers(result.users);
    } catch (err) {
      console.error('Error fetching Terra users:', err);
    }
  };

  // Deauth a specific Terra user
  const handleDeauthSingleUser = async (terraUserId: string, provider: string) => {
    try {
      await deauthTerraUser.mutateAsync({ terraUserId, provider });
      // Remove from local state
      setTerraApiUsers(prev => prev.filter(u => u.user_id !== terraUserId));
    } catch (err) {
      console.error('Error deauthing Terra user:', err);
    }
  };

  // Deauth all Terra users for this reference_id
  const handleDeauthAllUsers = async (providerFilter?: string) => {
    if (!inspectingUserId) return;
    
    try {
      const result = await deauthAllTerraUsers.mutateAsync({ 
        targetUserId: inspectingUserId, 
        providerFilter 
      });
      
      if (providerFilter) {
        // Remove only matching provider from local state
        setTerraApiUsers(prev => prev.filter(u => u.provider?.toUpperCase() !== providerFilter.toUpperCase()));
      } else {
        // Clear all
        setTerraApiUsers([]);
      }
    } catch (err) {
      console.error('Error deauthing all Terra users:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Terra Token Management</h2>
          <p className="text-muted-foreground">
            Управление токенами интеграций (Whoop, Garmin, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать токен
          </Button>
        </div>
      </div>

      {/* Dead Tokens Alert */}
      {deadTokensCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skull className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    Обнаружено {deadTokensCount} мёртвых подключений
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Токены активны, но данные не поступали более 7 дней
                  </p>
                </div>
              </div>
              <Button 
                variant={filterDead ? "destructive" : "outline"} 
                size="sm"
                onClick={() => setFilterDead(!filterDead)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {filterDead ? 'Показать все' : 'Показать мёртвые'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orphan Cleanup Section */}
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Unplug className="h-5 w-5 text-warning" />
            Очистка застрявших подключений
          </CardTitle>
          <CardDescription>
            Для пользователей с ошибкой "session expired" — проверьте и сбросьте подключения в Terra API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label>Выберите пользователя</Label>
              <Select value={selectedOrphanUserId} onValueChange={setSelectedOrphanUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Поиск пользователя..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Поиск..."
                      value={orphanSearchQuery}
                      onChange={(e) => setOrphanSearchQuery(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  {users
                    ?.filter(u => {
                      if (!orphanSearchQuery) return true;
                      const query = orphanSearchQuery.toLowerCase();
                      return u.full_name?.toLowerCase().includes(query) || u.user_id.toLowerCase().includes(query);
                    })
                    .map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              <User className="h-3 w-3" />
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.full_name || user.user_id.substring(0, 8)}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (!selectedOrphanUserId) return;
                const user = users?.find(u => u.user_id === selectedOrphanUserId);
                setInspectingUserId(selectedOrphanUserId);
                setInspectingUserName(user?.full_name || selectedOrphanUserId.substring(0, 8));
                setTerraApiUsers([]);
                setShowTerraUsersDialog(true);
                getTerraUsers.mutateAsync(selectedOrphanUserId).then(result => {
                  setTerraApiUsers(result.users);
                }).catch(err => {
                  console.error('Error fetching Terra users:', err);
                });
              }}
              disabled={!selectedOrphanUserId || getTerraUsers.isPending}
            >
              {getTerraUsers.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Проверить Terra API
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedOrphanUserId) return;
                const user = users?.find(u => u.user_id === selectedOrphanUserId);
                const userName = user?.full_name || selectedOrphanUserId.substring(0, 8);
                deauthAllTerraUsers.mutateAsync({ targetUserId: selectedOrphanUserId }).then(result => {
                  if (result.total === 0) {
                    toast.info(`У ${userName} нет подключений в Terra API`, {
                      description: 'Пользователь может попробовать подключиться заново'
                    });
                  } else {
                    toast.success(`Сброшено ${result.deauthenticated}/${result.total} подключений для ${userName}`, {
                      description: 'Пользователь может переподключить интеграцию'
                    });
                  }
                  setSelectedOrphanUserId('');
                }).catch(err => {
                  toast.error(`Ошибка сброса: ${err.message}`);
                });
              }}
              disabled={!selectedOrphanUserId || deauthAllTerraUsers.isPending}
            >
              {deauthAllTerraUsers.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4 mr-2" />
              )}
              Сбросить все
            </Button>
          </div>
          
          {/* Quick Deauth for known problem users */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Быстрый сброс для известных проблемных пользователей:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Pavel Radaev', id: '932aab9d-a104-4ba2-885f-2dfdc5dd5df2' },
                { name: 'Anton', id: 'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e' },
                { name: 'Aleksey Gubarev', id: 'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae' },
              ].map(user => (
                <Button
                  key={user.id}
                  variant="outline"
                  size="sm"
                  className="border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    deauthAllTerraUsers.mutateAsync({ targetUserId: user.id }).then(result => {
                      if (result.total === 0) {
                        toast.info(`У ${user.name} нет подключений в Terra API`, {
                          description: 'Пользователь может попробовать подключиться заново'
                        });
                      } else {
                        toast.success(`✅ ${user.name}: сброшено ${result.deauthenticated}/${result.total} подключений`, {
                          description: 'Пользователь может переподключить интеграцию'
                        });
                      }
                    }).catch(err => {
                      toast.error(`❌ Ошибка для ${user.name}: ${err.message}`);
                    });
                  }}
                  disabled={deauthAllTerraUsers.isPending}
                >
                  <Unplug className="h-3 w-3 mr-1" />
                  {user.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, Terra ID или провайдеру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tokens Table */}
      <Card>
        <CardHeader>
          <CardTitle>Активные токены ({tokens?.length || 0})</CardTitle>
          <CardDescription>
            Связи между пользователями и их Terra User ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Terra User ID</TableHead>
                <TableHead>Провайдер</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последняя синхр.</TableHead>
                <TableHead>Посл. данные</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTokens?.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={token.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {token.profile?.full_name || 'Без имени'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {token.user_id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {token.terra_user_id ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {token.terra_user_id.substring(0, 16)}...
                      </code>
                    ) : (
                      <Badge variant="outline" className="text-destructive">
                        Отсутствует
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{token.provider}</Badge>
                  </TableCell>
                  <TableCell>
                    {token.is_active ? (
                      <div className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">Активен</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm">Неактивен</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {token.last_sync_date ? (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(token.last_sync_date), 'dd MMM yyyy HH:mm', { locale: ru })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {token.last_webhook_date ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${token.is_dead ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {formatDistanceToNow(new Date(token.last_webhook_date), { 
                            addSuffix: true, 
                            locale: ru 
                          })}
                        </span>
                        {token.is_dead && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Skull className="h-4 w-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Нет данных {token.days_since_webhook} дней</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {token.terra_user_id && token.is_dead && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRequestHistorical(token)}
                                disabled={requestingHistorical === token.id}
                              >
                                {requestingHistorical === token.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <History className="h-4 w-4 text-primary" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Запросить данные за 30 дней</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleInspectTerraUsers(token)}
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Проверить Terra API</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(token)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(token)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredTokens || filteredTokens.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {filterDead ? 'Мёртвые токены не найдены' : 'Токены не найдены'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый токен</DialogTitle>
            <DialogDescription>
              Свяжите пользователя с его Terra User ID из Terra Dashboard
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Пользователь</Label>
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.full_name || user.user_id.substring(0, 8)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Terra User ID</Label>
              <Input
                placeholder="Вставьте из Terra Dashboard"
                value={newTerraUserId}
                onChange={(e) => setNewTerraUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Найдите в Terra Dashboard → Users → нужный пользователь → User ID
              </p>
            </div>

            <div className="space-y-2">
              <Label>Провайдер</Label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!newUserId || !newTerraUserId || createToken.isPending}
            >
              {createToken.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать токен</DialogTitle>
            <DialogDescription>
              Обновите Terra User ID или статус токена
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar>
                <AvatarImage src={selectedToken?.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {selectedToken?.profile?.full_name || 'Без имени'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedToken?.user_id}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Terra User ID</Label>
              <Input
                value={editTerraUserId}
                onChange={(e) => setEditTerraUserId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Провайдер</Label>
              <Select value={editProvider} onValueChange={setEditProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select 
                value={editIsActive ? 'active' : 'inactive'} 
                onValueChange={(v) => setEditIsActive(v === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleEdit}
              disabled={updateToken.isPending}
            >
              {updateToken.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить токен?</AlertDialogTitle>
            <AlertDialogDescription>
              Токен для {selectedToken?.profile?.full_name || 'пользователя'} ({selectedToken?.provider}) будет удалён. 
              Пользователю придётся переподключить интеграцию.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteToken.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terra API Users Dialog */}
      <Dialog open={showTerraUsersDialog} onOpenChange={setShowTerraUsersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Terra API подключения: {inspectingUserName}
            </DialogTitle>
            <DialogDescription>
              Подключения в Terra API для reference_id: <code className="bg-muted px-1 py-0.5 rounded text-xs">{inspectingUserId}</code>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {getTerraUsers.isPending ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Загрузка из Terra API...</span>
              </div>
            ) : terraApiUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-success" />
                <p className="font-medium">Подключений не найдено</p>
                <p className="text-sm">В Terra API нет подключений для этого пользователя</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Найдено {terraApiUsers.length} подключений
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeauthAllUsers()}
                    disabled={deauthAllTerraUsers.isPending}
                  >
                    {deauthAllTerraUsers.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unplug className="h-4 w-4 mr-2" />
                    )}
                    Сбросить все
                  </Button>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Провайдер</TableHead>
                      <TableHead>Terra User ID</TableHead>
                      <TableHead>Последний вебхук</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terraApiUsers.map((terraUser) => (
                      <TableRow key={terraUser.user_id}>
                        <TableCell>
                          <Badge variant="secondary">{terraUser.provider}</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {terraUser.user_id.substring(0, 20)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {terraUser.last_webhook_update ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(terraUser.last_webhook_update), { 
                                addSuffix: true, 
                                locale: ru 
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeauthSingleUser(terraUser.user_id, terraUser.provider)}
                            disabled={deauthTerraUser.isPending}
                          >
                            {deauthTerraUser.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unplug className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTerraUsersDialog(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
