import { ErrorInfo, Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

interface ErrorFallbackState {
  showDetails: boolean;
}

// Class component to avoid hooks issues during error recovery
export class ErrorFallback extends Component<ErrorFallbackProps, ErrorFallbackState> {
  constructor(props: ErrorFallbackProps) {
    super(props);
    this.state = { showDetails: false };
  }

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    const { error, errorInfo } = this.props;
    const { showDetails } = this.state;

    // Специальная обработка для chunk load errors
    const isChunkError = error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Failed to load module') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
          <Card className="max-w-md w-full glass-card animate-fade-in">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-bounce-in">
                <RefreshCw className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Обновление приложения</CardTitle>
              <CardDescription className="text-base">
                Доступна новая версия приложения. Пожалуйста, перезагрузите страницу для продолжения работы.
              </CardDescription>
            </CardHeader>

            <CardFooter className="flex gap-3">
              <Button 
                onClick={() => {
                  // Очистка всех кэшей
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => caches.delete(name));
                    });
                  }
                  window.location.reload();
                }}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Перезагрузить
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="max-w-2xl w-full glass-card animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center animate-bounce-in">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-bold">Что-то пошло не так</CardTitle>
            <CardDescription className="text-base">
              Произошла непредвиденная ошибка. Мы уже зафиксировали эту проблему и работаем над её исправлением.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-mono text-sm">
                  {error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Error details for debugging */}
            {(error || errorInfo) && process.env.NODE_ENV === 'development' && (
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={this.toggleDetails}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  {showDetails ? 'Скрыть технические детали' : 'Показать технические детали'}
                </Button>
                
                {showDetails && (
                  <div className="mt-4 space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                    {error?.stack && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Stack Trace:</h4>
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-60">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Component Stack:</h4>
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-40">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Что делать?</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Попробуйте перезагрузить страницу</li>
                <li>Вернитесь на главную страницу</li>
                <li>Очистите кеш браузера</li>
                <li>Если проблема повторяется, свяжитесь с поддержкой</li>
              </ul>
            </div>

            {/* App state info for debugging */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-muted/30 p-3 rounded-lg space-y-1 text-xs">
                <div><strong>URL:</strong> {window.location.href}</div>
                <div><strong>Time:</strong> {new Date().toISOString()}</div>
                <div><strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={this.handleReload}
              variant="default"
              className="w-full sm:w-auto ripple"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Перезагрузить страницу
            </Button>
            <Button
              onClick={this.handleGoHome}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Home className="h-4 w-4 mr-2" />
              На главную
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
}

// Легковесная версия для небольших компонентов - тоже class component
export class MiniErrorFallback extends Component<Pick<ErrorFallbackProps, 'error' | 'resetError'>> {
  render() {
    const { error, resetError } = this.props;
    
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg animate-fade-in">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-sm">Ошибка загрузки компонента</h3>
            {error && (
              <p className="text-xs text-muted-foreground font-mono">{error.message}</p>
            )}
            <Button
              onClick={resetError}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Попробовать снова
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
