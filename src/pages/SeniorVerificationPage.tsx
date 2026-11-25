import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Clock, XCircle, Lock } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import OtpLoginModal from '@/components/OtpLoginModal';
import { useAuth } from '@/lib/auth';
import { supabase, type Temple } from '@/lib/supabase';
import { calculateAge, formatDate } from '@/lib/booking';
import {
  submitSeniorVerification,
  fetchMySeniorVerifications,
  type SeniorVerification,
} from '@/lib/seniorVerification';

const STATUS_STYLES = {
  pending: { label: 'Pending review', icon: Clock, className: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-800 border-red-200' },
} as const;

export default function SeniorVerificationPage() {
  const [searchParams] = useSearchParams();
  const presetTempleId = searchParams.get('temple') ?? '';
  const { user, loading: authLoading } = useAuth();

  const [showLogin, setShowLogin] = useState(false);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [requests, setRequests] = useState<SeniorVerification[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [templeId, setTempleId] = useState(presetTempleId);
  const [visitorName, setVisitorName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    try {
      setRequests(await fetchMySeniorVerifications(user.id));
      setListError(null);
    } catch {
      setListError('We could not load your applications. Please refresh the page.');
    }
  }, [user]);

  useEffect(() => {
    supabase
      .from('temples')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          setFormError('Temples could not be loaded. Please refresh the page.');
          return;
        }
        setTemples((data ?? []) as Temple[]);
      });
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);
    setSubmitted(false);

    if (!templeId) return setFormError('Please choose a temple.');
    if (!visitorName.trim()) return setFormError('Please enter the senior citizen\'s full name.');
    if (!dateOfBirth) return setFormError('Please enter the date of birth.');
    if (calculateAge(dateOfBirth) > 120) return setFormError('Please check the date of birth.');

    setSubmitting(true);
    try {
      await submitSeniorVerification({
        user_id: user.id,
        temple_id: templeId,
        visitor_name: visitorName.trim(),
        date_of_birth: dateOfBirth,
      });
      setVisitorName('');
      setDateOfBirth('');
      setSubmitted(true);
      await loadRequests();
    } catch {
      setFormError('Your application could not be submitted. Please try again.');
    }
    setSubmitting(false);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 mb-2">Senior Citizen Darshan</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 leading-tight">
            Apply for senior citizen verification
          </h1>
          <p className="mt-3 text-navy-900/70 leading-relaxed">
            Senior citizen slots at a temple need an approved application from that temple's administrator.
            Once approved, you can book senior slots at that temple.
          </p>
        </div>

        {authLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-navy-900/50" />
          </div>
        ) : !user ? (
          <div className="bg-white rounded-xl border border-gold-200 shadow-sm p-8 text-center">
            <Lock className="w-8 h-8 text-gold-600 mx-auto mb-3" />
            <h2 className="font-serif text-xl font-bold text-navy-900 mb-2">Sign in to apply</h2>
            <p className="text-sm text-navy-900/70 mb-6">We need your mobile number to link the application to your account.</p>
            <button
              onClick={() => setShowLogin(true)}
              className="px-6 py-3 bg-navy-900 text-white text-sm font-bold rounded-lg hover:bg-navy-800 transition-colors"
            >
              Sign in with mobile number
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gold-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div>
                <label htmlFor="sv-temple" className="block text-sm font-semibold text-navy-900 mb-2">Temple</label>
                <select
                  id="sv-temple"
                  value={templeId}
                  onChange={(e) => setTempleId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
                >
                  <option value="">Select a temple</option>
                  {temples.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sv-name" className="block text-sm font-semibold text-navy-900 mb-2">Senior citizen's full name</label>
                <input
                  id="sv-name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  maxLength={120}
                  className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>

              <div>
                <label htmlFor="sv-dob" className="block text-sm font-semibold text-navy-900 mb-2">Date of birth</label>
                <input
                  id="sv-dob"
                  type="date"
                  max={today}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>

              {formError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {submitted && (
                <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Application submitted. The temple administrator will review it.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-navy-900 text-white text-sm font-bold rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit application'}
              </button>
            </form>

            <section>
              <h2 className="font-serif text-xl font-bold text-navy-900 mb-4">Your applications</h2>
              {listError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{listError}</div>
              )}
              {!listError && requests.length === 0 && (
                <p className="text-sm text-navy-900/60">You have not applied for senior verification yet.</p>
              )}
              <ul className="space-y-3">
                {requests.map((r) => {
                  const style = STATUS_STYLES[r.status];
                  const StatusIcon = style.icon;
                  return (
                    <li key={r.id} className="bg-white rounded-xl border border-navy-100 shadow-sm p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-navy-900">{r.visitor_name}</p>
                          <p className="text-sm text-navy-900/70">{r.temples?.name ?? 'Temple'}</p>
                          <p className="text-xs text-navy-900/60 mt-1">Submitted {formatDate(r.created_at.split('T')[0])}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${style.className}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {style.label}
                        </span>
                      </div>
                      {r.status === 'rejected' && r.admin_remarks && (
                        <p className="mt-3 text-sm text-red-800">Reason: {r.admin_remarks}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </div>

      <OtpLoginModal open={showLogin} onClose={() => setShowLogin(false)} onAuthenticated={() => setShowLogin(false)} />
    </PageLayout>
  );
}
