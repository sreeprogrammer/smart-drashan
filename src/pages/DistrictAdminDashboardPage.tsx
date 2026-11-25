import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarClock, CheckCircle2, Clock3, Loader2, Send, Shield } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type District = { id: string; name: string };
type Temple = { id: string; name: string };
type SlotRequest = {
  id: string;
  temple_id: string;
  category_type: 'local' | 'special';
  available_date: string;
  session_type: string;
  session_start_time: string;
  session_end_time: string;
  total_capacity: number;
  senior_capacity: number;
  ticket_price: number;
  status: string;
  admin_remarks: string | null;
  temples: { name: string } | null;
};

const initialForm = {
  templeId: '',
  category: 'local' as 'local' | 'special',
  date: '',
  session: 'morning',
  start: '06:00',
  end: '08:00',
  bookingOpens: '',
  bookingCloses: '',
};

function localDateValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function DistrictAdminDashboardPage() {
  const { user, adminRole, adminLoading, adminAssignments } = useAuth();
  const assignment = adminAssignments.find((item) => item.role === 'district_admin');
  const districtId = assignment?.district_id ?? null;
  const [district, setDistrict] = useState<District | null>(null);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [requests, setRequests] = useState<SlotRequest[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const today = localDateValue();

  const loadDistrict = useCallback(async () => {
    if (!districtId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
    const [districtResult, templeResult, requestResult] = await Promise.all([
      supabase.from('districts').select('id, name').eq('id', districtId).maybeSingle(),
      supabase.from('temples').select('id, name').eq('district_id', districtId).order('name'),
      supabase.from('slot_allocation_requests')
        .select('id, temple_id, category_type, available_date, session_type, session_start_time, session_end_time, total_capacity, senior_capacity, ticket_price, status, admin_remarks, temples(name)')
        .eq('district_id', districtId)
        .order('created_at', { ascending: false }),
    ]);
    if (districtResult.error || templeResult.error || requestResult.error) {
      setError('District information or slot requests could not be loaded. Confirm the latest database migration is applied.');
    } else {
      setDistrict(districtResult.data as District | null);
      const templeRows = (templeResult.data ?? []) as Temple[];
      setTemples(templeRows);
      setRequests((requestResult.data ?? []) as unknown as SlotRequest[]);
      setForm((current) => ({ ...current, templeId: current.templeId || templeRows[0]?.id || '' }));
    }
    } catch {
      setError('District data could not be loaded due to a network error.');
    } finally {
      setLoading(false);
    }
  }, [districtId]);

  useEffect(() => { loadDistrict(); }, [loadDistrict]);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.templeId || !form.date) {
      setError('Select a temple and darshan date.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: submitError } = await supabase.rpc('submit_slot_allocation_request', {
        p_temple_id: form.templeId,
        p_category_type: form.category,
        p_available_date: form.date,
        p_session_type: form.session,
        p_session_start_time: form.start,
        p_session_end_time: form.end,
        p_total_capacity: form.category === 'local' ? 100 : 50,
        p_senior_capacity: form.category === 'local' ? 25 : 0,
        p_ticket_price: form.category === 'local' ? 0 : 500,
        p_booking_opens_at: form.bookingOpens ? new Date(form.bookingOpens).toISOString() : null,
        p_booking_closes_at: form.bookingCloses ? new Date(form.bookingCloses).toISOString() : null,
      });
      if (submitError) {
        setError(submitError.message);
      } else {
        const result = data as { success?: boolean; request_id?: string; error?: string };
        if (!result.success) setError(result.error || 'The slot request could not be submitted.');
        else {
          setMessage(`Slot request ${result.request_id?.slice(0, 8) ?? ''} was sent for State Admin review.`);
          setForm((current) => ({ ...initialForm, templeId: current.templeId, date: current.date }));
          await loadDistrict();
        }
      }
    } catch {
      setError('The slot request could not be submitted due to a network error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || adminLoading) {
    return <PageLayout><div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-navy-900/50" /></div></PageLayout>;
  }

  if (!user || adminRole !== 'district_admin' || !districtId) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-gold-600" />
          <h1 className="font-serif text-2xl font-bold text-navy-900">District Admin access required</h1>
          <p className="mt-3 text-sm text-navy-900/70">This account must have an active State Admin assignment to one district.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">District Admin dashboard</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy-900">{district?.name ?? 'Assigned District'}</h1>
            <p className="mt-2 text-sm text-navy-900/70">Your access is scoped to this district’s temples and requests.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/admin/temple-information" className="text-sm font-semibold text-maroon-deep hover:underline">Temple information →</Link>
            <Link to="/admin" className="text-sm font-semibold text-maroon-deep hover:underline">Booking management →</Link>
          </div>
        </div>

        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</div>}
        {message && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4" />{message}</div>}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Assigned district', value: district?.name ?? 'Loading' },
            { label: 'Temples', value: String(temples.length) },
            { label: 'Slot requests', value: String(requests.length) },
          ].map((item) => <div key={item.label} className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm"><p className="text-sm text-navy-900/60">{item.label}</p><p className="mt-2 font-serif text-2xl font-bold text-navy-900">{item.value}</p></div>)}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-gold-600" />
              <div>
                <h2 className="font-serif text-xl font-bold text-navy-900">Request slot allocation</h2>
                <p className="text-xs text-navy-900/60">All requests require State Admin approval before slots become bookable.</p>
              </div>
            </div>
            <form onSubmit={submitRequest} className="space-y-4">
              <div>
                <label htmlFor="slot-temple" className="mb-1.5 block text-sm font-semibold text-navy-900">Temple</label>
                <select id="slot-temple" required value={form.templeId} onChange={(e) => setForm({ ...form, templeId: e.target.value })} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5">
                  <option value="">Select temple</option>
                  {temples.map((temple) => <option key={temple.id} value={temple.id}>{temple.name}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="slot-category" className="mb-1.5 block text-sm font-semibold text-navy-900">Darshan category</label>
                  <select id="slot-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as 'local' | 'special' })} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5">
                    <option value="local">Local — 100 (75 general + 25 senior)</option>
                    <option value="special">Special — 50 at ₹500 each</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="slot-date" className="mb-1.5 block text-sm font-semibold text-navy-900">Darshan date</label>
                  <input id="slot-date" type="date" min={today} required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="slot-session" className="mb-1.5 block text-sm font-semibold text-navy-900">Session</label>
                  <select id="slot-session" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5">
                    <option value="morning">Morning</option><option value="evening">Evening</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="slot-start" className="mb-1.5 block text-sm font-semibold text-navy-900">Session starts</label>
                  <input id="slot-start" type="time" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5" />
                </div>
                <div>
                  <label htmlFor="slot-end" className="mb-1.5 block text-sm font-semibold text-navy-900">Session ends (2 hours)</label>
                  <input id="slot-end" type="time" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="booking-opens" className="mb-1.5 block text-sm font-semibold text-navy-900">Booking opens (optional)</label>
                  <input id="booking-opens" type="datetime-local" value={form.bookingOpens} onChange={(e) => setForm({ ...form, bookingOpens: e.target.value })} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5" />
                </div>
                <div>
                  <label htmlFor="booking-closes" className="mb-1.5 block text-sm font-semibold text-navy-900">Booking closes (optional)</label>
                  <input id="booking-closes" type="datetime-local" value={form.bookingCloses} onChange={(e) => setForm({ ...form, bookingCloses: e.target.value })} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5" />
                </div>
              </div>
              <p className="rounded-lg bg-cream p-3 text-xs text-navy-900/70">Capacity and price are fixed by the authorized booking rules. The two one-hour slots are created only after State Admin approval.</p>
              <button type="submit" disabled={saving || temples.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-maroon-deep px-5 py-3 text-sm font-semibold text-white hover:bg-maroon-800 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for State Approval
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-gold-600" />
              <h2 className="font-serif text-xl font-bold text-navy-900">Slot approval status</h2>
            </div>
            {requests.length === 0 ? <p className="text-sm text-navy-900/65">No slot requests submitted yet.</p> : (
              <ul className="space-y-3">
                {requests.map((request) => (
                  <li key={request.id} className="rounded-lg border border-navy-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-navy-900">{request.temples?.name ?? 'Temple'} · {request.category_type} darshan</p>
                        <p className="mt-1 text-xs text-navy-900/60">{request.available_date} · {request.session_type} · {request.session_start_time.slice(0, 5)}–{request.session_end_time.slice(0, 5)}</p>
                      </div>
                      <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold capitalize text-navy-900">{request.status.replace(/_/g, ' ')}</span>
                    </div>
                    {request.admin_remarks && <p className="mt-3 text-sm text-maroon-deep">Reviewer: {request.admin_remarks}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </PageLayout>
  );
}
