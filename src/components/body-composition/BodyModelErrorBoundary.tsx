import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class BodyModelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[BodyModelErrorBoundary] 3D model error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="h-full flex flex-col items-center justify-center p-6 glass-medium border-destructive/20">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">3D Model Loading Error</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Failed to load the 3D body model. This might be due to browser compatibility.
          </p>
          <Button 
            onClick={this.handleReset} 
            variant="outline"
            size="sm"
          >
            Try Again
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
