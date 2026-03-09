import { ReactNode, Suspense } from 'react';
import { PageLoader } from '../ui/Spinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
  loading?: boolean;
  error?: Error | null;
}

/**
 * Page wrapper with loading, error, and suspense handling
 */
export function PageWrapper({ children, title, loading, error }: PageWrapperProps) {
  if (error) {
    throw error; // Will be caught by ErrorBoundary
  }

  if (loading) {
    return <PageLoader message={title ? `Loading ${title}...` : undefined} />;
  }

  return (
    <ErrorBoundary fallbackMessage="This page encountered an error">
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
