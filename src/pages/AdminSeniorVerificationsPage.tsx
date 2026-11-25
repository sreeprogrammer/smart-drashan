import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle, UserCheck } from 'lucide-react';
import AdminAccessGate from '@/components/AdminAccessGate';
import { calculateAge, formatDate } from '@/lib/booking';
import {
  fetchPendingSeniorVerifications,
  reviewSeniorVerification,
  type SeniorVerification,
} from '@/lib/seniorVerification';

export default function AdminSeniorVerificationsPage() {
  return (
    <AdminAccessGate>
      <SeniorReviewQueue />
    </AdminAccessGate>
  );
}

function SeniorReviewQueue() {
  const [pending, setPending] = useState<SeniorVerification[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadPending = useCallback(async () => {
    try {
      setPending(await fetchPendingSeniorVerifications());
      setLoadError(null);
    } catch {
      setLoadError('Pending applications could not be loaded. Please refresh the page.');
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const decide = async (item: SeniorVerification, decision: 'approved' | 'rejected') => {
    setActionError(null);
    if (decision === 'rejected' && !rejectReason.trim()) {
      setActionError('Please enter a reason before rejecting.');
      return;
    }
    setBusyId(item.id);
    try {
      const result = await reviewSeniorVerification(item.id, decision, rejectReason.trim());
      if (!result.success) {
        setActionError(result.error || 'The application could not be updated.');
      } else {
        setRejectingId(null);
        setRejectReason('');
        await loadPending();
      }
    } catch {
      setActionError('The application could not be updated. Please try again.');
    }
    setBusyId(null);
  };

  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-navy-900">Senior citizen applications</h1>
          <p className="mt-2 text-navy-900/70">Review applications for your temple. Approved applicants can book senior slots.</p>
        </div>

        {actionError && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {loadError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>
        )}

        {!loadError && pending.length === 0 && (
          <div className="bg-white rounded-xl border border-navy-100 p-10 text-center">
            <UserCheck className="w-8 h-8 text-navy-900/40 mx-auto mb-3" />
            <p className="text-navy-900/70">No applications are waiting for review.</p>
          </div>
        )}

        <ul className="space-y-4">
          {pending.map((item) => {
            const age = calculateAge(item.date_of_birth);
            const isRejecting = rejectingId === item.id;
            const isBusy = busyId === item.id;
            return (
              <li key={item.id} className="bg-white rounded-xl border border-navy-100 shadow-sm p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-navy-900 text-lg">{item.visitor_name}</p>
                    <p className="text-sm text-navy-900/70 mt-1">
                      Born {formatDate(item.date_of_birth)} (age {age})
                    </p>
                    <p className="text-xs text-navy-900/60 mt-1">Submitted {formatDate(item.created_at.split('T')[0])}</p>
                  </div>
                  {!isRejecting && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(item, 'approved')}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectingId(item.id); setRejectReason(''); setActionError(null); }}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-800 bg-white text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {isRejecting && (
                  <div className="mt-4 space-y-3 border-t border-navy-100 pt-4">
                    <label htmlFor={`reject-${item.id}`} className="block text-sm font-semibold text-navy-900">
                      Reason for rejection
                    </label>
                    <textarea
                      id={`reject-${item.id}`}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        disabled={isBusy}
                        className="px-4 py-2 text-sm font-semibold text-navy-900 rounded-lg hover:bg-navy-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => decide(item, 'rejected')}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50"
                      >
                        {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm rejection
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
