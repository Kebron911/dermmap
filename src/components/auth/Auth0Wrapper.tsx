import { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Auth0Wrapper — no-op passthrough.
// The actual auth system is custom JWT + bcrypt + TOTP (see backend/src/routes/auth.js).
// Auth0 is not used. This wrapper is retained only because main.tsx references it;
// its sole purpose is to render children unchanged.
// ---------------------------------------------------------------------------

interface Auth0WrapperProps {
  children: ReactNode;
}

export function Auth0Wrapper({ children }: Auth0WrapperProps) {
  return <>{children}</>;
}
