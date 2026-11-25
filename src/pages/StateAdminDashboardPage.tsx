import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Building2, CalendarClock, CheckCircle2, ClipboardList, Clock3, Loader2,
  MapPinned, Shield, Users, XCircle,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type District = { id: string; name: string };
type Temple = { id: string; name: string; district_id: string };
type SlotRequest = {
  id: string;
  temple_id: string;
  district_id: string;
  category_type: string;
  available_date: string;
  session_type: string;
  session_start_time: string;
  session_end_time: string;
  total_capacity: number;
  senior_capacity: number;
  ticket_price: number;
  status: string;
  submitted_by: string;
  admin_remarks: string | null;
  temples: { name: string } | null;
  districts: { name: string } | null;
};
type Assignment = {
  id: string;
  user_id: string;
  role: string;
  district_id: string | null;
  temple_id: string | null;
  is_active: boolean;
  districts: { name: string } | null;
};

export default function StateAdminDashboardPage() {
  const { user, adminRole, adminLoading } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [requests, setRequests] = useState<SlotRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [counts, setCounts] = useState({ bookings: 0, pendingVerifications: 0, slots: 0 });
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [targetUserId, setTargetUserId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState<'state_admin' | 'district_admin' | 'temple_staff'>('district_admin');
  const [assignmentDistrict, setAssignmentDistrict] = useState('');
  const [assignmentTemple, setAssignmentTemple] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStateData = useCallback(async () => {
    if (!user || adminRole !== 'state_admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
    const [
      districtResult,
      templeResult,
      requestResult,
      assignmentResult,
      bookingCount,
      verificationCount,
      slotCount,
    ] = await Promise.all([
      supabase.from('districts').select('id, name').order('name'),
      supabase.from('temples').select('id, name, district_id').order('name'),
      supabase.from('slot_allocation_requests')
        .select('id, temple_id, district_id, category_type, available_date, session_type, session_start_time, session_end_time, total_capacity, senior_capacity, ticket_price, status, submitted_by, admin_remarks, temples(name), districts(name)')
        .in('status', ['submitted', 'under_review', 'changes_requested'])
        .order('created_at', { ascending: true }),
      supabase.from('admin_assignments')
        .select('id, user_id, role, district_id, temple_id, is_active, districts(name)')
        .order('created_at', { ascending: false }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('senior_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('darshan_slots').select('id', { count: 'exact', head: true }),
    ]);

    const failed = [
      districtResult.error, templeResult.error, requestResult.error, assignmentResult.error,
      bookingCount.error, verificationCount.error, slotCount.error,
    ].some(Boolean);
    if (failed) {
      setError('Some State Admin data could not be loaded. Confirm the latest database migration is applied and retry.');
    }
    const districtRows = (districtResult.data ?? []) as District[];
    setDistricts(districtRows);
    setTemples((templeResult.data ?? []) as Temple[]);
    setRequests((requestResult.data ?? []) as unknown as SlotRequest[]);
    setAssignments((assignmentResult.data ?? []) as unknown as Assignment[]);
    setCounts({
      bookings: bookingCount.count ?? 0,
      pendingVerifications: verificationCount.count ?? 0,
      slots: slotCount.count ?? 0,
    });
    setAssignmentDistrict((current) => current || districtRows[0]?.id || '');
    setAssignmentTemple((current) => current || (templeResult.data?.[0]?.id as string | undefined) || '');
    } catch {
      setError('State Admin data could not be loaded due to a network error.');
    } finally {
      setLoading(false);
    }
  }, [adminRole, user]);

  useEffect(() => { loadStateData(); }, [loadStateData]);

  const review = async (request: SlotRequest, decision: 'approved' | 'rejected' | 'changes_requested') => {
    const note = remarks[request.id]?.trim() ?? '';
    if (decision !== 'approved' && !note) {
      setError('Enter reviewer remarks before rejecting or requesting changes.');
      return;
    }
    setBusy(request.id);
    setError(null);
    setMessage(null);
    try {
      const { data, error: reviewError } = await supabase.rpc('review_slot_allocation_request', {
        p_request_id: request.id,
        p_decision: decision,
        p_remarks: note,
      });
      if (reviewError) {
        setError(reviewError.message);
      } else {
        const result = data as { success?: boolean; status?: string; error?: string };
        if (!result.success) setError(result.error || 'The request could not be reviewed.');
        else {
          setMessage(`Slot request ${request.id.slice(0, 8)} was ${decision.replace(/_/g, ' ')}.`);
          setRemarks((current) => ({ ...current, [request.id]: '' }));
          await loadStateData();
        }
      }
    } catch {
      setError('The slot request could not be reviewed due to a network error.');
    } finally {
      setBusy(null);
    }
  };

  const saveAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetUserId.trim()) return setError('Enter the existing user’s Supabase user ID.');
    if (assignmentRole === 'district_admin' && !assignmentDistrict) return setError('Select the assigned district.');
    if (assignmentRole === 'temple_staff' && !assignmentTemple) return setError('Select the assigned temple.');
    setBusy('assignment');
    setError(null);
    setMessage(null);
    try {
      const { data, error: assignError } = await supabase.rpc('admin_set_assignment', {
        p_user_id: targetUserId.trim(),
        p_role: assignmentRole,
        p_district_id: assignmentRole === 'district_admin' ? assignmentDistrict : null,
        p_temple_id: assignmentRole === 'temple_staff' ? assignmentTemple : null,
        p_active: true,
      });
      if (assignError) {
        setError(assignError.message);
      } else {
        const result = data as { success?: boolean; error?: string };
        if (!result.success) setError(result.error || 'The administrator assignment was not saved.');
        else {
          setMessage('Administrator assignment saved.');
          setTargetUserId('');
          await loadStateData();
        }
      }
    } catch {
      setError('The administrator assignment could not be saved due to a network error.');
    } finally {
      setBusy(null);
    }
  };

  const deactivateAssignment = async (assignment: Assignment) => {
    setBusy(assignment.id);
    setError(null);
    setMessage(null);
    try {
      const { data, error: updateError } = await supabase.rpc('admin_set_assignment', {
        p_user_id: assignment.user_id,
        p_role: assignment.role,
        p_district_id: assignment.district_id,
        p_temple_id: assignment.temple_id,
        p_active: false,
      });
      if (updateError) {
        setError(updateError.message);
      } else {
        const result = data as { success?: boolean; error?: string };
        if (!result.success) setError(result.error || 'The assignment could not be deactivated.');
        else {
          setMessage('Administrator assignment deactivated.');
          await loadStateData();
        }
      }
    } catch {
      setError('The assignment could not be deactivated due to a network error.');
    } finally {
      setBusy(null);
    }
  };

  if (loading || adminLoading) {
    return <PageLayout><div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-navy-900/50" /></div></PageLayout>;
  }

  if (!user || adminRole !== 'state_admin') {
    return (
      <PageLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-gold-600" />
          <h1 className="font-serif text-2xl font-bold text-navy-900">State Admin access required</h1>
          <p className="mt-3 text-sm text-navy-900/70">A State Admin assignment must be provisioned by a trusted database operator or an existing State Admin.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">State Admin</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy-900 sm:text-4xl">Tamil Nadu Operations</h1>
            <p className="mt-2 text-sm text-navy-900/70">Review slot proposals and manage authorized administrator assignments.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin" className="rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900">Booking management</Link>
            <Link to="/admin/senior-verifications" className="rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900">Verification queue</Link>
            <Link to="/admin/temple-information" className="rounded-lg border border-gold-300 bg-gold-50 px-4 py-2.5 text-sm font-semibold text-maroon-deep">Temple information</Link>
          </div>
        </div>

        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</div>}
        {message && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4" />{message}</div>}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Districts', value: districts.length, icon: MapPinned },
            { label: 'Temples', value: temples.length, icon: Building2 },
            { label: 'Bookings', value: counts.bookings, icon: ClipboardList },
            { label: 'Pending verifications', value: counts.pendingVerifications, icon: Users },
            { label: 'Darshan slots', value: counts.slots, icon: CalendarIcon },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm text-navy-900/65"><span>{label}</span><Icon className="h-5 w-5 text-gold-600" /></div>
              <p className="mt-3 font-serif text-2xl font-bold text-navy-900">{value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="font-serif text-xl font-bold text-navy-900">Slot request approvals</h2><p className="mt-1 text-sm text-navy-900/60">Approved sessions publish two one-hour slots.</p></div>
              <Clock3 className="h-5 w-5 text-gold-600" />
            </div>
            {requests.length === 0 ? <p className="rounded-lg bg-cream p-5 text-sm text-navy-900/65">No slot allocation requests are waiting for review.</p> : (
              <ul className="space-y-4">
                {requests.map((request) => (
                  <li key={request.id} className="rounded-lg border border-navy-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold capitalize text-navy-900">{request.temples?.name ?? 'Temple'} · {request.category_type} darshan</p>
                        <p className="mt-1 text-xs text-navy-900/60">{request.districts?.name} · {request.available_date} · {request.session_type} · {request.session_start_time.slice(0, 5)}–{request.session_end_time.slice(0, 5)}</p>
                        <p className="mt-1 text-xs text-navy-900/60">{request.total_capacity} tickets · senior reserved {request.senior_capacity} · ₹{request.ticket_price}</p>
                        <p className="mt-1 font-mono text-[10px] text-navy-900/45">Request {request.id}</p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-800">{request.status.replace(/_/g, ' ')}</span>
                    </div>
                    <label htmlFor={`request-remarks-${request.id}`} className="sr-only">Reviewer remarks</label>
                    <textarea id={`request-remarks-${request.id}`} value={remarks[request.id] ?? ''} onChange={(e) => setRemarks((current) => ({ ...current, [request.id]: e.target.value }))} maxLength={500} rows={2} placeholder="Remarks (required for rejection or changes)" className="mt-3 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-gold-500" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => review(request, 'approved')} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Approve &amp; publish</button>
                      <button onClick={() => review(request, 'changes_requested')} disabled={busy !== null} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50">Request changes</button>
                      <button onClick={() => review(request, 'rejected')} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-800 disabled:opacity-50"><XCircle className="h-4 w-4" />Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-8">
            <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-2"><Shield className="h-5 w-5 text-gold-600" /><h2 className="font-serif text-xl font-bold text-navy-900">Assign administrator</h2></div>
              <form onSubmit={saveAssignment} className="space-y-4">
                <div>
                  <label htmlFor="admin-user-id" className="mb-1.5 block text-sm font-semibold text-navy-900">Existing Supabase user ID</label>
                  <input id="admin-user-id" required value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="UUID from the authenticated user account" className="w-full rounded-lg border border-navy-200 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label htmlFor="admin-role" className="mb-1.5 block text-sm font-semibold text-navy-900">Role</label>
                  <select id="admin-role" value={assignmentRole} onChange={(e) => setAssignmentRole(e.target.value as typeof assignmentRole)} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm">
                    <option value="district_admin">District Admin</option><option value="temple_staff">Temple Staff</option><option value="state_admin">State Admin</option>
                  </select>
                </div>
                {assignmentRole === 'district_admin' && <div>
                  <label htmlFor="admin-district" className="mb-1.5 block text-sm font-semibold text-navy-900">District</label>
                  <select id="admin-district" required value={assignmentDistrict} onChange={(e) => setAssignmentDistrict(e.target.value)} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm">
                    <option value="">Select district</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
                  </select>
                </div>}
                {assignmentRole === 'temple_staff' && <div>
                  <label htmlFor="admin-temple" className="mb-1.5 block text-sm font-semibold text-navy-900">Temple</label>
                  <select id="admin-temple" required value={assignmentTemple} onChange={(e) => setAssignmentTemple(e.target.value)} className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm">
                    <option value="">Select temple</option>{temples.map((temple) => <option key={temple.id} value={temple.id}>{temple.name}</option>)}
                  </select>
                </div>}
                <p className="text-xs leading-relaxed text-navy-900/60">Public registration cannot assign admin roles. This audited server-side operation can only assign an existing account.</p>
                <button type="submit" disabled={busy !== null} className="rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === 'assignment' ? 'Saving…' : 'Save assignment'}</button>
              </form>
            </section>

            <section className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 font-serif text-xl font-bold text-navy-900">Assigned administrators</h2>
              {assignments.length === 0 ? <p className="text-sm text-navy-900/65">No additional assignments found.</p> : (
                <ul className="max-h-80 space-y-3 overflow-y-auto">
                  {assignments.map((item) => <li key={item.id} className="rounded-lg bg-cream p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono text-navy-900/60">{item.user_id}</p>
                        <p className="mt-1 text-sm font-semibold capitalize text-navy-900">{item.role.replace(/_/g, ' ')}{item.districts?.name ? ` · ${item.districts.name}` : ''}</p>
                        <p className={`mt-1 text-xs ${item.is_active ? 'text-emerald-700' : 'text-red-700'}`}>{item.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                      {item.is_active && <button type="button" onClick={() => deactivateAssignment(item)} disabled={busy !== null} className="rounded border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50">Suspend</button>}
                    </div>
                  </li>)}
                </ul>
              )}
            </section>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 font-serif text-xl font-bold text-navy-900">All Tamil Nadu districts</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {districts.map((district) => {
              const templeCount = temples.filter((temple) => temple.district_id === district.id).length;
              return <div key={district.id} className="flex items-center justify-between rounded-lg bg-cream px-4 py-3 text-sm"><span className="font-medium text-navy-900">{district.name}</span><span className="text-xs text-navy-900/60">{templeCount} temples</span></div>;
            })}
          </div>
        </section>
      </main>
    </PageLayout>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return <CalendarClock className={className} />;
}
