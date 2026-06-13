import { Navigate } from 'react-router-dom';
import { useSession } from '@/stores/session';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const isLoggedIn = useSession((s) => s.isLoggedIn());
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}
