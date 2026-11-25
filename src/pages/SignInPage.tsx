import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import OtpLoginModal from '@/components/OtpLoginModal';
import VisitorProfileCompletion from '@/components/VisitorProfileCompletion';
import { useAuth } from '@/lib/auth';
import { isVisitorProfileComplete, loadVisitorProfile } from '@/lib/visitorProfile';

export default function SignInPage() {
  const { user, isDemoMode, adminRole, adminLoading, adminAccessError, refreshAdmin } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSetup, setProfileSetup] = useState(false);

  const handleProfileCompleted = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!user || adminLoading || adminRole !== 'visitor') return;
    let active = true;
    const phone = user.phone || String(user.user_metadata?.demo_phone ?? '');
    loadVisitorProfile(user.id, phone, isDemoMode).then((result) => {
      if (!active) return;
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      setProfileSetup(!isVisitorProfileComplete(result.profile));
    }).catch(() => {
      if (active) setProfileError('Your profile could not be checked. Please try again.');
    });
    return () => { active = false; };
  }, [user, isDemoMode, adminRole, adminLoading]);

  const handleAuthenticated = async () => {
    const role = await refreshAdmin();
    setShowLogin(false);
    setProfileError(null);
    if (role === 'state_admin') navigate('/state-admin');
    else if (role === 'district_admin') navigate('/district-admin');
    else if (role === 'temple_admin' || role === 'temple_staff') navigate('/admin');
    else if (user) {
      const phone = user.phone || String(user.user_metadata?.demo_phone ?? '');
      const result = await loadVisitorProfile(user.id, phone, isDemoMode);
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      if (isVisitorProfileComplete(result.profile)) navigate('/dashboard');
      else setProfileSetup(true);
    } else {
      setProfileError('Sign-in completed, but the account could not be loaded. Please try again.');
    }
  };

  return (
    <PageLayout>
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg rounded-2xl border border-gold-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-maroon-deep">
            <KeyRound className="h-7 w-7" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-600">Welcome back</p>
          <h1 className="font-serif text-3xl font-bold text-navy-900">Sign in to Smart Darshan</h1>
          {profileError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{profileError}</p>}
          {profileSetup && user ? (
            <VisitorProfileCompletion
              userId={user.id}
              phone={user.phone || String(user.user_metadata?.demo_phone ?? '')}
              isDemoMode={isDemoMode}
              onCompleted={handleProfileCompleted}
            />
          ) : user ? (
            <div className="mt-4">
              <p className="text-sm text-emerald-700">You are signed in to your account.</p>
              {adminAccessError && <p role="alert" className="mt-2 text-sm text-amber-800">{adminAccessError}</p>}
              <button
                type="button"
                disabled={adminLoading}
                onClick={handleAuthenticated}
                className="mt-5 rounded-lg bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
              >
                {adminLoading ? 'Checking access…' : 'Continue to dashboard'}
              </button>
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-navy-900/70">
                Verify your mobile number with an OTP. First-time visitors can complete their details here after verification.
              </p>
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-maroon-deep to-maroon-800 px-6 py-3 font-semibold text-white transition hover:shadow-lg"
              >
                Sign in with OTP
              </button>
            </>
          )}
        </div>
      </section>
      <OtpLoginModal open={showLogin} onClose={() => setShowLogin(false)} onAuthenticated={handleAuthenticated} />
    </PageLayout>
  );
}
