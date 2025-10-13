import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhoopSetupWizardProps {
  onComplete?: () => void;
}

const STEPS = [
  {
    id: 1,
    title: 'Настройка DNS домена',
    description: 'Создайте CNAME запись для вашего поддомена',
  },
  {
    id: 2,
    title: 'Регистрация в Whoop Developer Portal',
    description: 'Создайте приложение в Whoop Developer Portal',
  },
  {
    id: 3,
    title: 'Запрос SSL сертификата',
    description: 'Откройте тикет в Terra Support для SSL',
  },
  {
    id: 4,
    title: 'Конфигурация Terra Dashboard',
    description: 'Введите Whoop credentials в Terra Dashboard',
  },
  {
    id: 5,
    title: 'Тестирование',
    description: 'Протестируйте подключение Whoop',
  },
];

export function WhoopSetupWizard({ onComplete }: WhoopSetupWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [subdomain, setSubdomain] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({
      title: 'Скопировано',
      description: `${label} скопировано в буфер обмена`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const markStepComplete = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Для интеграции Whoop требуется собственный домен с доступом к DNS настройкам
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Ваш поддомен для Whoop</Label>
              <Input
                id="subdomain"
                placeholder="whoop.yourcompany.com"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
              />
            </div>

            <div className="space-y-3 p-4 glass-card">
              <h4 className="font-semibold">Инструкция:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Зайдите в DNS панель вашего провайдера (GoDaddy, Cloudflare, etc.)</li>
                <li>Создайте новую CNAME запись:
                  <div className="ml-6 mt-2 space-y-1 font-mono text-xs">
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span>Type: CNAME</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span>Name: whoop (или {subdomain || 'whoop.yourcompany.com'})</span>
                      {subdomain && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(subdomain.split('.')[0] || 'whoop', 'Name')}
                        >
                          {copied === 'Name' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span className="break-all">Value: FdJ930Xal-1994597418.eu-west-2.elb.amazonaws.com</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard('FdJ930Xal-1994597418.eu-west-2.elb.amazonaws.com', 'CNAME Value')}
                      >
                        {copied === 'CNAME Value' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span>TTL: Automatic или 3600</span>
                    </div>
                  </div>
                </li>
                <li>Сохраните запись</li>
                <li>Дождитесь пропагации DNS (10-30 минут, максимум 48 часов)</li>
              </ol>

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Проверьте пропагацию DNS командой: <code className="text-xs">nslookup {subdomain || 'whoop.yourcompany.com'}</code>
                </AlertDescription>
              </Alert>
            </div>

            <Button 
              onClick={() => {
                if (!subdomain) {
                  toast({
                    title: 'Ошибка',
                    description: 'Введите ваш поддомен',
                    variant: 'destructive',
                  });
                  return;
                }
                markStepComplete(1);
                nextStep();
              }}
              className="w-full"
            >
              DNS настроен, продолжить
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-3 p-4 glass-card">
              <h4 className="font-semibold">Инструкция:</h4>
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>Скачайте приложение Whoop (iOS/Android)</li>
                <li>Создайте аккаунт с email и паролем</li>
                <li>Войдите на Developer Portal:
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => window.open('https://external-developer-portal.whoop.com/', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    external-developer-portal.whoop.com
                  </Button>
                </li>
                <li>Создайте Team с вашими данными</li>
                <li>Создайте App со следующими параметрами:
                  <div className="ml-6 mt-2 space-y-1 font-mono text-xs">
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span className="break-all">Redirect URL: https://{subdomain || 'whoop.yourcompany.com'}/auth/whoop/oauth2</span>
                      {subdomain && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://${subdomain}/auth/whoop/oauth2`, 'Redirect URL')}
                        >
                          {copied === 'Redirect URL' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span className="break-all">Webhook URL: https://{subdomain || 'whoop.yourcompany.com'}/hooks/whoop/push</span>
                      {subdomain && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://${subdomain}/hooks/whoop/push`, 'Webhook URL')}
                        >
                          {copied === 'Webhook URL' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
                <li>
                  <strong>Включите ВСЕ Scopes:</strong>
                  <div className="ml-6 mt-2 grid grid-cols-2 gap-1 text-xs">
                    <Badge variant="secondary">read:recovery</Badge>
                    <Badge variant="secondary">read:cycles</Badge>
                    <Badge variant="secondary">read:sleep</Badge>
                    <Badge variant="secondary">read:workout</Badge>
                    <Badge variant="secondary">read:profile</Badge>
                    <Badge variant="secondary">read:body_measurement</Badge>
                  </div>
                </li>
                <li>Скопируйте Client ID и Client Secret</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Whoop Client ID</Label>
              <Input
                id="client_id"
                placeholder="your-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_secret">Whoop Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                placeholder="your-client-secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <Button 
                onClick={() => {
                  if (!clientId || !clientSecret) {
                    toast({
                      title: 'Ошибка',
                      description: 'Введите Client ID и Client Secret',
                      variant: 'destructive',
                    });
                    return;
                  }
                  markStepComplete(2);
                  nextStep();
                }}
                className="flex-1"
              >
                Данные Whoop сохранены
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-3 p-4 glass-card">
              <h4 className="font-semibold">Запрос SSL сертификата в Terra:</h4>
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>Откройте Terra Dashboard Support:
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => window.open('https://dashboard.tryterra.co/dashboard/support', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Terra Support
                  </Button>
                </li>
                <li>Создайте тикет со следующим текстом:</li>
              </ol>

              <div className="relative">
                <pre className="p-4 bg-muted/20 rounded text-xs overflow-x-auto">
{`Subject: WHOOP SSL Certificate Request

Hello Terra Team,

I need to set up WHOOP integration and require an SSL certificate for my subdomain.

Subdomain: ${subdomain || 'whoop.yourcompany.com'}

I have already created the CNAME record pointing to:
FdJ930Xal-1994597418.eu-west-2.elb.amazonaws.com

Please provide instructions for SSL certificate validation.

Thank you!`}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(
                    `Subject: WHOOP SSL Certificate Request\n\nHello Terra Team,\n\nI need to set up WHOOP integration and require an SSL certificate for my subdomain.\n\nSubdomain: ${subdomain || 'whoop.yourcompany.com'}\n\nI have already created the CNAME record pointing to:\nFdJ930Xal-1994597418.eu-west-2.elb.amazonaws.com\n\nPlease provide instructions for SSL certificate validation.\n\nThank you!`,
                    'Ticket Text'
                  )}
                >
                  {copied === 'Ticket Text' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Terra Support ответит в течение 1-2 рабочих дней и попросит добавить дополнительные CNAME записи для SSL валидации
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <Button 
                onClick={() => {
                  markStepComplete(3);
                  nextStep();
                }}
                className="flex-1"
              >
                Тикет создан, SSL получен
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-3 p-4 glass-card">
              <h4 className="font-semibold">Настройка Terra Dashboard:</h4>
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>Откройте Terra Dashboard Connections:
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => window.open('https://dashboard.tryterra.co/dashboard/connections', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Terra Connections
                  </Button>
                </li>
                <li>Найдите <strong>WHOOP</strong> в списке провайдеров</li>
                <li>Нажмите <strong>Configure</strong> или <strong>Settings</strong></li>
                <li>Введите данные:
                  <div className="ml-6 mt-2 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span className="text-xs">Client ID: {clientId || '(из шага 2)'}</span>
                      {clientId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(clientId, 'Client ID')}
                        >
                          {copied === 'Client ID' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span className="text-xs">Client Secret: {clientSecret ? '••••••••' : '(из шага 2)'}</span>
                      {clientSecret && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(clientSecret, 'Client Secret')}
                        >
                          {copied === 'Client Secret' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span className="text-xs break-all">Redirect URL: https://{subdomain || 'whoop.yourcompany.com'}/auth/whoop/oauth2</span>
                      {subdomain && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://${subdomain}/auth/whoop/oauth2`, 'Redirect URL Config')}
                        >
                          {copied === 'Redirect URL Config' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
                <li>Сохраните конфигурацию</li>
                <li>Убедитесь что статус "Configured" или "Active"</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <Button 
                onClick={() => {
                  markStepComplete(4);
                  nextStep();
                }}
                className="flex-1"
              >
                Terra Dashboard настроен
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                Настройка завершена! Теперь можно протестировать подключение
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 glass-card">
              <h4 className="font-semibold">Тестирование:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Вернитесь на страницу Integrations</li>
                <li>Нажмите "Подключить Whoop"</li>
                <li>Авторизуйтесь через Whoop OAuth</li>
                <li>Проверьте что устройство появилось в списке подключенных</li>
                <li>Запустите синхронизацию данных</li>
              </ol>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Важно:</strong> После успешного тестирования вам нужно подать заявку на Production Approval в Whoop Developer Portal. Процесс может занять 1-2 недели.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <Button 
                onClick={() => {
                  markStepComplete(5);
                  toast({
                    title: 'Настройка завершена!',
                    description: 'Whoop интеграция готова к использованию',
                  });
                  onComplete?.();
                }}
                className="flex-1"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Завершить настройку
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Шаг {currentStep} из {STEPS.length}</span>
          <span className="text-muted-foreground">{Math.round((completedSteps.length / STEPS.length) * 100)}% завершено</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${(completedSteps.length / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`w-full text-left p-3 rounded-lg transition-all ${
              currentStep === step.id 
                ? 'bg-primary/10 border border-primary/20' 
                : 'bg-muted/5 border border-transparent hover:border-muted/20'
            }`}
          >
            <div className="flex items-center gap-3">
              {completedSteps.includes(step.id) ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              ) : currentStep === step.id ? (
                <Circle className="h-5 w-5 text-primary flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${
                  currentStep === step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}
