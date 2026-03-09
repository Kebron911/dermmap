import { Auth0Provider } from '@auth0/auth0-react';
import { ReactNode } from 'react';
import { config } from '../../config';

// ---------------------------------------------------------------------------
// Auth0 Provider Wrapper — enables Auth0 authentication in production.
// In demo mode, returns children without Auth0.
// ---------------------------------------------------------------------------

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || '';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || '';

interface Auth0WrapperProps {
  children: ReactNode;
}

export function Auth0Wrapper({ children }: Auth0WrapperProps) {
  // Demo mode or missing config — skip Auth0
  if (config.authProvider !== 'auth0' || !AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      {children}
    </Auth0Provider>
  );
}
