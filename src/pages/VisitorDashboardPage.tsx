import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, CalendarCheck, CheckCircle2, Circle, ClipboardCheck,
  Compass, Loader2, MapPin, Ticket, UserRound,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import OtpLoginModal from '@/components/OtpLoginModal';
import { useAuth, type VisitorProfile } from '@/lib/auth';
import { fetchUserBookings } from '@/lib/booking';
import { getLocalDemoBookings } from '@/lib/localDemoBookings';
import { isVisitorProfileComplete, loadVisitorProfile } from '@/lib/visitorProfile';
import type { BookingWithDetails } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

type VerificationSummary = { id: string; status: string; created_at: string };

export default function VisitorDashboardPage() {
  const { user, isDemoMode, loading: authLoading, adminLoading, adminRole, adminAccessError, refreshAdmin } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [verifications, setVerifications] = useState<VerificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const phone = user?.phone || String(user?.user_metadata?.demo_phone ?? '');
    if (isDemoMode && user) {
      const profileResult = await loadVisitorProfile(user.id, phone, true);
      setProfile(profileResult.profile);
      setBookings(getLocalDemoBookings());
      setVerifications([]);
      setError(profileResult.error);
      setLoading(false);
      if (!profileResult.error && !isVisitorProfileComplete(profileResult.profile)) {
        navigate('/signin', { replace: true });
      }
      return;
    }

    const activeUserId = user?.id
      ?? (await supabase.auth.getUser()).data.user?.id
      ?? null;
    if (!activeUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [profileResult, bookingResult, verificationResult] = await Promise.all([
        loadVisitorProfile(activeUserId, phone, false),
        fetchUserBookings(),
        supabase.from('senior_verifications').select('id, status, created_at').eq('user_id', activeUserId).order('created_at', { ascending: false }),
      ]);
      if (profileResult.error || verificationResult.error) {
        setError('Some dashboard information could not be loaded. Please try again.');
      }
      setProfile(profileResult.profile);
      setBookings(bookingResult);
      setVerifications(verificationResult.data ?? []);
      if (!profileResult.error && !isVisitorProfileComplete(profileResult.profile)) {
        navigate('/signin', { replace: true });
      }
    } catch {
      setError('Some dashboard information could not be loaded. Please try again.');
    }
    setLoading(false);
  }, [user, isDemoMode, navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (adminLoading) return;
    if (adminRole === 'state_admin') navigate('/state-admin', { replace: true });
    else if (adminRole === 'district_admin') navigate('/district-admin', { replace: true });
    else if (adminRole === 'temple_admin' || adminRole === 'temple_staff') navigate('/admin', { replace: true });
  }, [adminLoading, adminRole, navigate]);

  const handleAuthenticated = async () => {
    const role = await refreshAdmin();
    setShowLogin(false);
    if (role === 'state_admin') navigate('/state-admin');
    else if (role === 'district_admin') navigate('/district-admin');
    else if (role === 'temple_admin' || role === 'temple_staff') navigate('/admin');
    else if (user) {
      const phone = user.phone || String(user.user_metadata?.demo_phone ?? '');
      const profileResult = await loadVisitorProfile(user.id, phone, isDemoMode);
      if (profileResult.error) {
        setError(profileResult.error);
      } else if (isVisitorProfileComplete(profileResult.profile)) {
        await loadDashboard();
      } else {
        navigate('/signin');
      }
    } else {
      setError('Sign-in completed, but the account could not be loaded. Please try again.');
    }
  };

  if (authLoading || adminLoading || loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-navy-900/50" /></div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <UserRound className="mx-auto mb-4 h-12 w-12 text-gold-600" />
          <h1 className="font-serif text-3xl font-bold text-navy-900">Visitor Dashboard</h1>
          <p className="mt-3 text-sm text-navy-900/70">Sign in with your mobile number and verify the OTP to continue.</p>
          <button onClick={() => setShowLogin(true)} className="mt-6 rounded-lg bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800">Sign in with OTP</button>
          <OtpLoginModal open={showLogin} onClose={() => setShowLogin(false)} onAuthenticated={handleAuthenticated} />
        </div>
      </PageLayout>
    );
  }

  const upcoming = bookings.filter((booking) => booking.booking_status === 'confirmed' || booking.booking_status === 'pending');
  const completedSteps = Number(!!profile) + Number(!!profile?.phone_verified) + Number(verifications.length > 0) + Number(bookings.length > 0);
  const onboarding = [
    { title: 'Complete your profile', detail: 'Add your name, age, verified phone, and location details.', to: '/signin', done: !!profile },
    { title: 'Choose a verification category', detail: 'General visitors can browse and book directly; local and senior categories may require review.', to: '/senior-verification', done: !!profile && (profile.account_type !== 'visitor' || verifications.length > 0) },
    { title: 'Submit and track verification', detail: 'Check the review status of any eligibility applications.', to: '/senior-verification', done: verifications.length > 0 },
    { title: 'Explore temples', detail: 'Browse districts, temple history, timings, facilities, and directions.', to: '/districts', done: true },
    { title: 'Choose a darshan category', detail: 'Select an eligible Local or Special Darshan option.', to: '/tickets', done: bookings.length > 0 },
    { title: 'Choose a date and time slot', detail: 'View current availability for each temple.', to: '/tickets', done: bookings.length > 0 },
    { title: 'Enter visitor details', detail: 'Review attendee names, group size, and required information.', to: '/tickets', done: bookings.length > 0 },
    { title: 'Confirm your booking', detail: 'Review your selection and complete payment when required.', to: '/my-tickets', done: bookings.some((booking) => booking.booking_status === 'confirmed') },
    { title: 'Access your digital ticket', detail: 'Open your booking to view the QR ticket and download options.', to: '/my-tickets', done: bookings.some((booking) => booking.booking_status === 'confirmed') },
    { title: 'Present your ticket at the temple', detail: 'Arrive at the assigned time and present your ticket for validation.', to: '/my-tickets', done: bookings.some((booking) => booking.booking_status === 'completed') },
  ];

  return (
    <PageLayout>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">Your Smart Darshan account</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy-900 sm:text-4xl">
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
            </h1>
            <p className="mt-2 text-sm text-navy-900/70">Follow your temple visits, bookings, and verification progress here.</p>
          </div>
          <Link to="/tickets" className="inline-flex items-center gap-2 rounded-lg bg-maroon-deep px-5 py-3 text-sm font-semibold text-white hover:bg-maroon-800">
            <Ticket className="h-4 w-4" /> Book darshan
          </Link>
        </div>

        {error && <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</div>}
        {adminAccessError && <div role="alert" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{adminAccessError}</div>}

        {!profile && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div>
              <h2 className="font-semibold text-amber-900">Complete your visitor profile</h2>
              <p className="mt-1 text-sm text-amber-800">Your verified mobile account still needs profile information before you can continue.</p>
            </div>
            <Link to="/register" className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white">Complete profile</Link>
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Profile', value: profile ? 'Complete' : 'Incomplete', icon: UserRound },
            { label: 'Mobile verification', value: profile?.phone_verified ? 'Verified' : 'Pending', icon: CheckCircle2 },
            { label: 'Applications', value: String(verifications.length), icon: ClipboardCheck },
            { label: 'Active bookings', value: String(upcoming.length), icon: CalendarCheck },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm text-navy-900/65"><span>{label}</span><Icon className="h-5 w-5 text-gold-600" /></div>
              <p className="mt-3 font-serif text-2xl font-bold text-navy-900">{value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">

          <div className="space-y-6">
            <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-gold-600" />
                <h2 className="font-serif text-xl font-bold text-navy-900">Verification applications</h2>
              </div>
              {verifications.length === 0 ? (
                <p className="text-sm text-navy-900/65">No applications submitted yet.</p>
              ) : (
                <ul className="space-y-3">
                  {verifications.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-cream p-3 text-sm">
                      <span className="font-mono text-xs text-navy-900/60">{item.id.slice(0, 8)}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-navy-900">{item.status.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/senior-verification" className="mt-4 inline-flex text-sm font-semibold text-maroon-deep hover:underline">View verification options →</Link>
            </section>

            <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gold-600" />
                <h2 className="font-serif text-xl font-bold text-navy-900">Your bookings</h2>
              </div>
              <p className="text-sm text-navy-900/65">{bookings.length ? `${bookings.length} booking${bookings.length === 1 ? '' : 's'} on your account.` : 'No bookings yet. Explore temples and choose a darshan slot.'}</p>
              <Link to="/my-tickets" className="mt-4 inline-flex text-sm font-semibold text-maroon-deep hover:underline">View My Tickets →</Link>
            </section>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
