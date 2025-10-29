import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTrainingPlanDetail } from '@/hooks/useTrainingPlanDetail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Dumbbell, 
  TrendingUp,
  Edit,
  Copy,
  Trash2,
  Target,
  Activity
} from 'lucide-react';
import { 
  TrainerStatCard, 
  TrainerClientCard,
  TrainerProgressRing,
  TrainerBadge
} from '@/components/trainer/ui';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function TrainingPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plan, loading, deletePlan, duplicatePlan } = useTrainingPlanDetail(id || null);

  const handleDelete = async () => {
    const success = await deletePlan();
    if (success) {
      navigate('/trainer-dashboard?tab=plans');
    }
  };

  const handleDuplicate = async () => {
    const newPlanId = await duplicatePlan();
    if (newPlanId) {
      navigate(`/training-plans/${newPlanId}`);
    }
  };

  if (loading) {
    return <PageLoader message="Загрузка плана..." />;
  }

  if (!plan) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">План не найден</h2>
            <p className="text-muted-foreground mb-4">
              Запрошенный план не существует или был удален
            </p>
            <Button onClick={() => navigate('/trainer-dashboard?tab=plans')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к планам
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeClients = plan.assigned_training_plans?.filter(a => a.status === 'active').length || 0;
  const totalWorkouts = plan.training_plan_workouts?.length || 0;
  const completionRate = 85; // TODO: Calculate from actual data

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/trainer-dashboard">Панель тренера</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/trainer-dashboard?tab=plans">Планы</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>{plan.name}</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-trainer-orange/10 via-trainer-blue/10 to-trainer-purple/10 border border-border/50">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="relative p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/trainer-dashboard?tab=plans')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold">{plan.name}</h1>
              </div>
              {plan.description && (
                <p className="text-muted-foreground text-lg ml-14">
                  {plan.description}
                </p>
              )}
              <div className="flex items-center gap-3 ml-14">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {plan.duration_weeks} недель
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  {totalWorkouts} тренировок
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {activeClients} активных клиентов
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Копировать
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить план?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие нельзя отменить. План будет удален навсегда.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TrainerStatCard
              title="Активных клиентов"
              value={activeClients}
              icon={<Users />}
              color="blue"
              subtitle="Назначен план"
            />
            <TrainerStatCard
              title="Тренировок в неделю"
              value={totalWorkouts}
              icon={<Dumbbell />}
              color="orange"
              subtitle="В расписании"
            />
            <TrainerStatCard
              title="Выполнение"
              value={`${completionRate}%`}
              icon={<TrendingUp />}
              color="green"
              subtitle="Средний показатель"
            />
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="workouts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workouts">
            <Dumbbell className="h-4 w-4 mr-2" />
            Тренировки
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="h-4 w-4 mr-2" />
            Клиенты
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Обзор
          </TabsTrigger>
        </TabsList>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="space-y-4">
          {plan.training_plan_workouts && plan.training_plan_workouts.length > 0 ? (
            <div className="grid gap-4">
              {plan.training_plan_workouts
                .sort((a, b) => a.day_of_week - b.day_of_week)
                .map((workout) => {
                  const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
                  return (
                    <Card key={workout.id} className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                              <TrainerBadge variant="info">
                                {dayNames[workout.day_of_week]}
                              </TrainerBadge>
                              {workout.workout_name}
                            </CardTitle>
                            {workout.description && (
                              <p className="text-sm text-muted-foreground">
                                {workout.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {workout.exercises?.length || 0} упражнений
                          </Badge>
                        </div>
                      </CardHeader>
                      {workout.exercises && workout.exercises.length > 0 && (
                        <CardContent>
                          <div className="space-y-3">
                            {workout.exercises.map((exercise, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
                              >
                                <div className="flex-1">
                                  <h4 className="font-medium">{exercise.exercise_name}</h4>
                                  {exercise.notes && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {exercise.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="font-semibold">{exercise.sets}</div>
                                    <div className="text-xs text-muted-foreground">подходов</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold">{exercise.reps}</div>
                                    <div className="text-xs text-muted-foreground">повторов</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold">{exercise.rest_seconds}с</div>
                                    <div className="text-xs text-muted-foreground">отдых</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Нет тренировок</h3>
                <p className="text-muted-foreground">
                  В этом плане пока нет добавленных тренировок
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          {plan.assigned_training_plans && plan.assigned_training_plans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plan.assigned_training_plans.map((assignment) => (
                <TrainerClientCard
                  key={assignment.id}
                  client={{
                    id: assignment.client_id,
                    username: assignment.profiles.username,
                    full_name: assignment.profiles.full_name,
                    avatar_url: assignment.profiles.avatar_url,
                    goals_count: 0
                  }}
                  healthScore={75}
                  isActive={assignment.status === 'active'}
                  lastActivity={`Начал ${new Date(assignment.start_date).toLocaleDateString('ru-RU')}`}
                  onViewDetails={() => navigate(`/trainer-dashboard?tab=clients&client=${assignment.client_id}`)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Нет назначенных клиентов</h3>
                <p className="text-muted-foreground">
                  Этот план еще не назначен ни одному клиенту
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Информация о плане
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Создан:</span>
                  <span className="font-medium">
                    {new Date(plan.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Длительность:</span>
                  <span className="font-medium">{plan.duration_weeks} недель</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Всего тренировок:</span>
                  <span className="font-medium">{totalWorkouts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Активных клиентов:</span>
                  <span className="font-medium">{activeClients}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Эффективность
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Средний прогресс</span>
                  <div className="flex items-center gap-2">
                    <TrainerProgressRing value={completionRate} size={40} strokeWidth={4} />
                    <span className="font-semibold">{completionRate}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  План показывает хорошие результаты у назначенных клиентов
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
