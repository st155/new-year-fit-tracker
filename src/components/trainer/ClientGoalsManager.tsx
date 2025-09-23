import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Target, Edit, Trash2, User, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  assigned_at: string;
  active: boolean;
  goals_count?: number;
  last_measurement?: string;
}

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  is_personal: boolean;
  challenge_id?: string;
}

interface ClientGoalsManagerProps {
  clients: Client[];
  selectedClient: Client | null;
  onSelectClient: (client: Client | null) => void;
}

export function ClientGoalsManager({ clients, selectedClient, onSelectClient }: ClientGoalsManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [newGoal, setNewGoal] = useState({
    goal_name: "",
    goal_type: "strength",
    target_value: 0,
    target_unit: "",
    is_personal: true
  });

  useEffect(() => {
    if (selectedClient) {
      loadClientGoals();
    }
  }, [selectedClient]);

  const loadClientGoals = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', selectedClient.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      console.error('Error loading goals:', error);
      toast.error('Ошибка загрузки целей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!selectedClient || !newGoal.goal_name.trim()) return;

    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: selectedClient.user_id,
          goal_name: newGoal.goal_name,
          goal_type: newGoal.goal_type,
          target_value: newGoal.target_value,
          target_unit: newGoal.target_unit,
          is_personal: newGoal.is_personal
        });

      if (error) throw error;

      toast.success('Цель создана');
      setIsCreateDialogOpen(false);
      setNewGoal({
        goal_name: "",
        goal_type: "strength",
        target_value: 0,
        target_unit: "",
        is_personal: true
      });
      loadClientGoals();
    } catch (error: any) {
      console.error('Error creating goal:', error);
      toast.error('Ошибка создания цели');
    }
  };

  const handleUpdateGoal = async (goal: Goal) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          goal_name: goal.goal_name,
          goal_type: goal.goal_type,
          target_value: goal.target_value,
          target_unit: goal.target_unit
        })
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('Цель обновлена');
      setEditingGoal(null);
      loadClientGoals();
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast.error('Ошибка обновления цели');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Цель удалена');
      loadClientGoals();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      toast.error('Ошибка удаления цели');
    }
  };

  const goalTypeLabels: Record<string, string> = {
    strength: 'Сила',
    cardio: 'Кардио',
    endurance: 'Выносливость',
    body_composition: 'Состав тела',
    flexibility: 'Гибкость'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Управление целями</h2>
        {selectedClient && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Новая цель
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать цель для {selectedClient.full_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goal_name">Название цели</Label>
                  <Input
                    id="goal_name"
                    value={newGoal.goal_name}
                    onChange={(e) => setNewGoal({ ...newGoal, goal_name: e.target.value })}
                    placeholder="Например: Жим лёжа"
                  />
                </div>

                <div>
                  <Label htmlFor="goal_type">Тип цели</Label>
                  <Select
                    value={newGoal.goal_type}
                    onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(goalTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="target_value">Целевое значение</Label>
                    <Input
                      id="target_value"
                      type="number"
                      value={newGoal.target_value}
                      onChange={(e) => setNewGoal({ ...newGoal, target_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="target_unit">Единица измерения</Label>
                    <Input
                      id="target_unit"
                      value={newGoal.target_unit}
                      onChange={(e) => setNewGoal({ ...newGoal, target_unit: e.target.value })}
                      placeholder="кг, раз, мин"
                    />
                  </div>
                </div>

                <Button onClick={handleCreateGoal} className="w-full">
                  Создать цель
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Выбор клиента */}
      {!selectedClient ? (
        <Card>
          <CardHeader>
            <CardTitle>Выберите подопечного</CardTitle>
            <CardDescription>Выберите подопечного для управления его целями</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Card 
                  key={client.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectClient(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={client.avatar_url} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.full_name || client.username}</p>
                        <p className="text-sm text-muted-foreground">{client.goals_count || 0} целей</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Заголовок с информацией о клиенте */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedClient.avatar_url} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{selectedClient.full_name || selectedClient.username}</h3>
                    <p className="text-muted-foreground">@{selectedClient.username}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => onSelectClient(null)}>
                  Выбрать другого
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Список целей */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : goals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Нет целей</h3>
                <p className="text-muted-foreground text-center">
                  У этого подопечного пока нет целей. Создайте первую цель.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    {editingGoal?.id === goal.id ? (
                      <div className="space-y-4">
                        <Input
                          value={editingGoal.goal_name}
                          onChange={(e) => setEditingGoal({ ...editingGoal, goal_name: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            type="number"
                            value={editingGoal.target_value}
                            onChange={(e) => setEditingGoal({ ...editingGoal, target_value: parseFloat(e.target.value) || 0 })}
                          />
                          <Input
                            value={editingGoal.target_unit}
                            onChange={(e) => setEditingGoal({ ...editingGoal, target_unit: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateGoal(editingGoal)}>
                            <Save className="h-4 w-4 mr-1" />
                            Сохранить
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingGoal(null)}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{goal.goal_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{goalTypeLabels[goal.goal_type]}</Badge>
                            <span className="text-sm text-muted-foreground">
                              Цель: {goal.target_value} {goal.target_unit}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingGoal(goal)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}