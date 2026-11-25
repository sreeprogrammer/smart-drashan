import { LogOut, Shield, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function AdminHeader() {
  const { user, adminRole, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState(false);
  const dashboardPath = adminRole === 'state_admin'
    ? '/state-admin'
    : adminRole === 'district_admin'
      ? '/district-admin'
      : adminRole === 'visitor'
        ? '/dashboard'
        : '/admin';
  const dashboardLabel = adminRole === 'state_admin'
    ? 'State Admin'
    : adminRole === 'district_admin'
      ? 'District Admin'
      : adminRole === 'visitor'
        ? 'My Account'
        : 'Temple Admin';
  const handleSignOut = async () => {
    try {
      await signOut();
      setSignOutError(false);
    } catch {
      setSignOutError(true);
    }
  };

  return (
    <div className="bg-maroon-deep px-4 py-3 text-white sm:py-3.5">
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-5">
        {signOutError && <span role="alert" className="text-xs text-cream">Sign out failed. Please try again.</span>}
        {user ? (
          <>
            <Link to={dashboardPath} className="flex min-h-7 items-center gap-2 text-sm font-semibold transition-colors duration-200 hover:text-gold-300">
              {adminRole === 'visitor' ? <UserRound className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
              <span>{dashboardLabel}</span>
            </Link>
            <button type="button" onClick={handleSignOut} className="flex min-h-7 items-center gap-2 text-sm font-medium text-white/85 transition-colors duration-200 hover:text-gold-300">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <Link
            to="/admin"
            className="flex min-h-7 items-center gap-2 text-sm font-semibold transition-colors duration-200 hover:text-gold-300"
          >
            <Shield className="h-4 w-4" />
            <span>Admin Login</span>
          </Link>
        )}
      </div>
    </div>
  );
}
