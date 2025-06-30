import React, { type ErrorInfo } from 'react';
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { logger } from '../lib/utils/logging';
import './ErrorBoundary.css';

const ErrorFallback: React.FC<FallbackProps> = ({ error }) => {
  return (
    <div role="alert" className="error-boundary-fallback">
      <h2>Something went wrong.</h2>
      <p>We've logged the error and our team will look into it.</p>
      <details>
        <summary>Error Details</summary>
        <pre>{error.message}</pre>
      </details>
    </div>
  );
};

const handleGlobalError = (error: Error, info: ErrorInfo) => {
  logger.error('Caught by Error Boundary:', { error, componentStack: info.componentStack });
};

export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback} onError={handleGlobalError}>
      {children}
    </ReactErrorBoundary>
  );
};
