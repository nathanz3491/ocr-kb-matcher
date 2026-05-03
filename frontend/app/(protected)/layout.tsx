import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute redirectTo="/auth/register">{children}</ProtectedRoute>;
}
