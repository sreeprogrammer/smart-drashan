import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Lock, Unlock, CalendarClock } from 'lucide-react';
import AdminAccessGate from '@/components/AdminAccessGate';
import { useAuth } from '@/lib/auth';
import { fetchUpcomingSlotsForTemple, setSlotClosed, formatDate, formatTime } from '@/lib/booking';
import type { SlotAvailability } from '@/lib/supabase';

export default function AdminSlotsPage() {
  return (
    <AdminAccessGate>
      <SlotManager />
    </AdminAccessGate>
  );
}

function slotStatusStyle(slot: SlotAvailability) {
  if (slot.is_closed) return { label: 'Closed', className: 'bg-slate-100 text-slate-700 border-slate-300' };
  if (slot.total_remaining <= 0) return { label: 'Fully booked', className: 'bg-red-50 text-red-800 border-red-200' };
  return { label: 'Open', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
}

function SlotManager() {
  const { adminProfile } = useAuth();
  const templeId = adminProfile?.temple_id ?? null;

  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    if (!templeId) return;
    setLoading(true);
    try {
      setSlots(await fetchUpcomingSlotsForTemple(templeId));
      setLoadError(null);
    } catch {
      setLoadError('Slots could not be loaded. Please refresh the page.');
    }
    setLoading(false);
  }, [templeId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const toggleClosed = async (slot: SlotAvailability) => {
    setActionError(null);
    setBusyId(slot.slot_id);
    try {
      const result = await setSlotClosed(slot.slot_id, !slot.is_closed);
      if (!result.success) {
        setActionError(result.error || 'The slot could not be updated.');
      } else {
        await loadSlots();
      }
    } catch {
      setActionError('The slot could not be updated. Please try again.');
    }
    setBusyId(null);
  };

  const slotsByDate = slots.reduce<Record<string, SlotAvailability[]>>((acc, slot) => {
    (acc[slot.slot_date] ??= []).push(slot);
    return acc;
  }, {});

  if (!templeId) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <p className="text-navy-900/70">Your account is not assigned to a temple yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-navy-900">Slot management</h1>
          <p className="mt-2 text-navy-900/70">
            Close a slot to stop new bookings for it. Bookings already made are not cancelled.
          </p>
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

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-navy-900/50" />
          </div>
        )}

        {!loading && !loadError && slots.length === 0 && (
          <div className="bg-white rounded-xl border border-navy-100 p-10 text-center">
            <CalendarClock className="w-8 h-8 text-navy-900/40 mx-auto mb-3" />
            <p className="text-navy-900/70">No upcoming slots for this temple.</p>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(slotsByDate).map(([date, daySlots]) => (
            <section key={date} className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
              <h2 className="px-5 py-3 bg-navy-900 text-cream font-semibold text-sm">{formatDate(date)}</h2>
              <ul className="divide-y divide-navy-100">
                {daySlots.map((slot) => {
                  const status = slotStatusStyle(slot);
                  const isBusy = busyId === slot.slot_id;
                  return (
                    <li key={slot.slot_id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-navy-900">
                          {formatTime(slot.slot_start_time)} - {formatTime(slot.slot_end_time)}
                        </p>
                        <p className="text-xs text-navy-900/60 mt-1 capitalize">
                          {slot.session_type} session, {slot.category_type} darshan
                        </p>
                        <p className="text-xs text-navy-900/70 mt-1">
                          General left: {slot.general_remaining} of {slot.total_capacity - slot.senior_capacity}
                          {slot.category_type === 'local' && ` | Senior left: ${slot.senior_remaining} of ${slot.senior_capacity}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                        <button
                          onClick={() => toggleClosed(slot)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-navy-200 text-navy-900 bg-white hover:bg-navy-50 transition-colors disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : slot.is_closed ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                          {slot.is_closed ? 'Reopen' : 'Close slot'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
