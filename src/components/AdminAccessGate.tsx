import { type ReactNode } from 'react';
import { Loader2, Lock } from 'lucide-react';
import AdminCredentialLogin from '@/components/AdminCredentialLogin';
import { useAuth } from '@/lib/auth';

export default function AdminAccessGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, adminLoading, adminAccessError, refreshAdmin } = useAuth();

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="w-6 h-6 animate-spin text-navy-900/50" />
      </div>
    );
  }

  if (isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="bg-white rounded-xl border border-gold-200 shadow-sm p-8 text-center max-w-md w-full">
        <Lock className="w-8 h-8 text-gold-600 mx-auto mb-3" />
        <h1 className="font-serif text-xl font-bold text-navy-900 mb-2">Temple Admin sign in</h1>
        <p className="text-sm text-navy-900/70 mb-6">
          {user ? adminAccessError || 'This account is not assigned an administrator role.' : 'Sign in with your administrator credentials.'}
        </p>
        <AdminCredentialLogin onAuthenticated={refreshAdmin} />
      </div>
    </div>
  );
}
