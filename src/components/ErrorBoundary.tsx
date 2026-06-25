// ErrorBoundary.tsx
import  { Component, type ErrorInfo, type ReactNode } from 'react';
import './error-boundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  showDetails: boolean; // New state to track if details are shown
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: process.env.NODE_ENV === 'development' // Show details by default in dev
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error: error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo: errorInfo
    });

    // Always log errors to console in development
    console.error('🚨 ERROR BOUNDARY CAUGHT:', error);
    console.error('📋 Component that errored:', errorInfo.componentStack);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
      showDetails: process.env.NODE_ENV === 'development'
    });

    if (this.props.onReset) {
      this.props.onReset();
    }

    console.log('Error boundary has been reset.');
  };

  refreshPage = (): void => {
    console.log('Refreshing page...');
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  copyErrorToClipboard = (): void => {
    const errorText = `Error: ${this.state.error?.toString()}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}\n\nStack Trace:\n${this.state.error?.stack || 'N/A'}`;
    
    navigator.clipboard.writeText(errorText)
      .then(() => {
        console.log('Error details copied to clipboard');
        // You could add a temporary notification here
      })
      .catch(err => {
        console.error('Failed to copy error details:', err);
      });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount, showDetails } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return this.renderDefaultErrorUI();
    }

    return children;
  }

  private renderDefaultErrorUI(): ReactNode {
    const { error, errorInfo, retryCount, showDetails } = this.state;
    const isDevelopment = process.env.NODE_ENV === 'development';

    return (
      <div className="error-boundary-container">
        <div className="error-boundary-card">
          {/* Error Icon and Title */}
          <div className="error-boundary-header">
            <div className="error-boundary-icon">💥</div>
            <h1 className="error-boundary-title">Application Error</h1>
          </div>

          {/* Quick Error Summary - Always visible */}
          <div className="error-boundary-summary">
            <p className="error-boundary-error-preview">
              <strong>Error:</strong> {error?.message || 'Unknown error'}
            </p>
            {errorInfo?.componentStack && (
              <p className="error-boundary-component-preview">
                <strong>Component:</strong> {this.extractComponentName(errorInfo.componentStack)}
              </p>
            )}
          </div>

          {/* Details Section */}
          <div className="error-boundary-details-section">
            <button
              onClick={this.toggleDetails}
              className="error-boundary-details-toggle"
              aria-expanded={showDetails}
            >
              {showDetails ? '▼ Hide Technical Details' : '▶ Show Technical Details'}
            </button>

            {showDetails && error && (
              <div className="error-boundary-error-details">
                {/* Error Message */}
                <div className="error-boundary-error-group">
                  <h4 className="error-boundary-error-title">Error Message</h4>
                  <code className="error-boundary-error-message">
                    {error.toString()}
                  </code>
                </div>

                {/* Component Stack */}
                {errorInfo?.componentStack && (
                  <div className="error-boundary-error-group">
                    <h4 className="error-boundary-error-title">Component Stack</h4>
                    <pre className="error-boundary-stack-trace">
                      {this.formatComponentStack(errorInfo.componentStack)}
                    </pre>
                  </div>
                )}

                {/* Full Stack Trace */}
                {error.stack && (
                  <div className="error-boundary-error-group">
                    <h4 className="error-boundary-error-title">Stack Trace</h4>
                    <pre className="error-boundary-stack-trace">
                      {this.formatStackTrace(error.stack)}
                    </pre>
                  </div>
                )}

                {/* Copy Button */}
                <button
                  onClick={this.copyErrorToClipboard}
                  className="error-boundary-copy-button"
                  title="Copy error details to clipboard"
                >
                  📋 Copy Error Details
                </button>
              </div>
            )}
          </div>

          {/* Development Tips (only shown in dev mode) */}
          {isDevelopment && (
            <div className="error-boundary-dev-tips">
              <h4 className="error-boundary-dev-title">💡 Development Tips:</h4>
              <ul className="error-boundary-dev-list">
                <li>Check browser console for more details</li>
                <li>Verify variable names and imports</li>
                <li>Look for undefined variables (like "laptop is not defined")</li>
                <li>Check React component syntax and hooks usage</li>
              </ul>
            </div>
          )}

          {/* Recovery Actions */}
          <div className="error-boundary-actions">
            <button
              onClick={this.resetErrorBoundary}
              className="error-boundary-primary-button"
              aria-label="Try to recover from the error"
            >
              {retryCount === 0 ? 'Try Again' : `Try Again (${retryCount + 1})`}
            </button>
            
            <button
              onClick={this.refreshPage}
              className="error-boundary-secondary-button"
              aria-label="Refresh the entire page"
            >
              Refresh Page
            </button>
          </div>

          {/* Environment Info */}
          <div className="error-boundary-env-info">
            <span className="error-boundary-env-badge">
              {isDevelopment ? 'Development Mode' : 'Production Mode'}
            </span>
            <span className="error-boundary-time">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Helper methods for formatting
  private extractComponentName(stack: string): string {
    const match = stack.match(/at (\w+)/);
    return match ? match[1] : 'Unknown component';
  }

  private formatComponentStack(stack: string): string {
    // Clean up the component stack for better readability
    return stack
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  private formatStackTrace(stack: string): string {
    // Limit stack trace to first 10 lines for readability
    return stack
      .split('\n')
      .slice(0, 15)
      .join('\n');
  }
}

export default ErrorBoundary;
