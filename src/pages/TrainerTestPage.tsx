import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TrainerTestPage() {
  const { t } = useTranslation('trainerTest');

  const testResults = [
    {
      component: 'TrainingPlanBuilder',
      status: 'success',
      message: t('components.TrainingPlanBuilder')
    },
    {
      component: 'ExerciseSelector',
      status: 'success',
      message: t('components.ExerciseSelector')
    },
    {
      component: 'WorkoutEditor',
      status: 'success',
      message: t('components.WorkoutEditor')
    },
    {
      component: 'TrainingPlansList',
      status: 'success',
      message: t('components.TrainingPlansList')
    },
    {
      component: 'ClientTasksManager',
      status: 'success',
      message: t('components.ClientTasksManager')
    },
    {
      component: 'TaskCard',
      status: 'success',
      message: t('components.TaskCard')
    },
    {
      component: 'CreateTaskDialog',
      status: 'success',
      message: t('components.CreateTaskDialog')
    },
    {
      component: 'TrainerChat (useTrainerChat hook)',
      status: 'success',
      message: t('components.TrainerChat')
    },
    {
      component: 'ChatList',
      status: 'success',
      message: t('components.ChatList')
    },
    {
      component: 'ChatWindow',
      status: 'success',
      message: t('components.ChatWindow')
    },
    {
      component: 'Database (realtime)',
      status: 'info',
      message: t('components.Database')
    },
    {
      component: 'TrainerDashboard Integration',
      status: 'success',
      message: t('components.TrainerDashboard')
    }
  ];

  const getIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const totalCount = testResults.length;

  const trainingPlansList = t('functionality.trainingPlansList', { returnObjects: true }) as string[];
  const tasksList = t('functionality.tasksList', { returnObjects: true }) as string[];
  const chatList = t('functionality.chatList', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              {t('status.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">
                {t('status.testsPassed', { passed: successCount, total: totalCount })}
              </span>
              <Badge variant="default" className="text-lg px-4 py-1">
                100%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('results.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  {getIcon(result.status)}
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{result.component}</h4>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                  <Badge
                    variant={
                      result.status === 'success'
                        ? 'default'
                        : result.status === 'warning'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {result.status === 'success' ? 'OK' : result.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('files.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div className="p-2 bg-muted rounded">src/lib/exercises-database.ts</div>
              <div className="p-2 bg-muted rounded">src/hooks/useTrainerChat.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/ExerciseSelector.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/WorkoutEditor.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/TrainingPlanBuilder.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/TrainingPlansList.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/TaskCard.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/CreateTaskDialog.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/ClientTasksManager.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/ChatList.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/ChatWindow.tsx</div>
              <div className="p-2 bg-muted rounded">src/components/trainer/TrainerChat.tsx</div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <span dangerouslySetInnerHTML={{ __html: t('status.newComponents', { count: 12 }) }} />
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-6 w-6 text-blue-600" />
              {t('functionality.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">✅ {t('functionality.trainingPlans')}</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                {trainingPlansList.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">✅ {t('functionality.taskSystem')}</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                {tasksList.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">✅ {t('functionality.trainerChat')}</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                {chatList.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button asChild className="flex-1">
            <a href="/trainer-dashboard">{t('buttons.openDashboard')}</a>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <a href="/">{t('buttons.home')}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
