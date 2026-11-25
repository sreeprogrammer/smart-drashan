import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Moon, ScreenShare, Sun, Ticket, Users } from 'lucide-react';
import type { SlotAvailability } from '@/lib/supabase';
import { formatTime, isSlotPast } from '@/lib/booking';

interface SlotSelectionProps {
  slots: SlotAvailability[];
  selectedSlotId: string | null;
  onSelect: (slot: SlotAvailability | null) => void;
  isSenior: boolean;
}

const DAILY_SLOT_TIMES = {
  morning: { start: '07:00', end: '08:00' },
  evening: { start: '19:00', end: '20:00' },
} as const;

function timeKey(value: string) {
  return value.slice(0, 5);
}

export default function SlotSelection({ slots, selectedSlotId, onSelect, isSenior }: SlotSelectionProps) {
  const [now, setNow] = useState(() => Date.now());
  const grouped = useMemo(() => {
    const byDate: Record<string, { morning?: SlotAvailability; evening?: SlotAvailability }> = {};
    slots.forEach((slot) => {
      const session = slot.session_type as keyof typeof DAILY_SLOT_TIMES;
      const expected = DAILY_SLOT_TIMES[session];
      if (!expected || timeKey(slot.slot_start_time) !== expected.start || timeKey(slot.slot_end_time) !== expected.end) return;
      byDate[slot.slot_date] ??= {};
      byDate[slot.slot_date][session] = slot;
    });
    return byDate;
  }, [slots]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const selectedSlot = slots.find((slot) => slot.slot_id === selectedSlotId);
    if (selectedSlot && isSlotPast(selectedSlot, now)) onSelect(null);
  }, [now, onSelect, selectedSlotId, slots]);

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center">
        <Clock className="mx-auto mb-3 h-10 w-10 text-navy-900/25" />
        <p className="font-semibold text-navy-900">No 7–8 slots available</p>
        <p className="mt-1 text-sm text-navy-900/60">Daily slots are 7:00–8:00 AM and 7:00–8:00 PM. Please check back later.</p>
      </div>
    );
  }

  const renderSession = (slot: SlotAvailability | undefined, session: 'morning' | 'evening') => {
    if (!slot) return null;

    const booked = isSenior ? slot.booked_senior : slot.booked_general;
    const capacity = isSenior ? slot.senior_capacity : slot.total_capacity - slot.senior_capacity;
    const remaining = isSenior ? slot.senior_remaining : slot.general_remaining;
    const selected = slot.slot_id === selectedSlotId;
    const closed = slot.is_closed || slot.slot_status === 'closed';
    const full = remaining <= 0 || slot.slot_status === 'full';
    const expired = isSlotPast(slot, now);
    const disabled = closed || full || expired;
    const SeatIcon = session === 'morning' ? Sun : Moon;
    const occupiedSeats = Math.min(booked, capacity);

    return (
      <button
        key={slot.slot_id}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(slot)}
        aria-pressed={selected}
        className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all ${
          selected
            ? 'border-maroon-deep bg-maroon-50 shadow-lg ring-2 ring-maroon-deep/20'
            : disabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-75'
              : 'border-gold-200 bg-white hover:-translate-y-0.5 hover:border-maroon-deep/50 hover:shadow-md'
        }`}
      >
        <div className={`flex items-center justify-between px-4 py-3 ${
          selected ? 'bg-maroon-deep text-white' : 'bg-gradient-to-r from-navy-900 to-navy-800 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <SeatIcon className="h-4 w-4 text-gold-300" />
            <span className="text-sm font-bold">{session === 'morning' ? 'Morning slot' : 'Evening slot'}</span>
          </div>
          {selected && <Check className="h-5 w-5 text-white" />}
          {closed && <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase">Closed</span>}
          {!closed && full && <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase">Sold out</span>}
          {!closed && !full && expired && <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase">Time passed</span>}
        </div>

        <div className="relative p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-lg font-bold text-navy-950">
                {formatTime(slot.slot_start_time)} – {formatTime(slot.slot_end_time)}
              </p>
              <p className="mt-1 text-xs text-navy-900/55">{isSenior ? 'Senior quota' : 'General entry'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-cream px-2.5 py-2 text-xs font-semibold text-navy-800">
              <Users className="h-4 w-4 text-gold-700" />
              {remaining} left
            </div>
          </div>

          <div className="mb-2 flex justify-center">
            <div className="flex w-4/5 items-center justify-center gap-2 rounded-t-full border-t-4 border-gold-400 px-3 pt-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-navy-900/40">
              <ScreenShare className="h-3 w-3" /> Darshan entrance
            </div>
          </div>

          <div className="grid grid-cols-10 justify-items-center gap-x-1 gap-y-1.5" aria-label={`${booked} of ${capacity} places booked`}>
            {Array.from({ length: capacity }, (_, index) => {
              const isBooked = index < occupiedSeats;
              return (
                <span
                  key={index}
                  aria-hidden="true"
                  className={`h-3 w-3 rounded-t-md rounded-b-sm ${
                    isBooked
                      ? 'bg-slate-400 shadow-inner'
                      : selected
                        ? 'bg-maroon-300'
                        : 'bg-emerald-500 group-hover:bg-emerald-600'
                  }`}
                />
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-dashed border-navy-900/15 pt-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-navy-900/60">
              <Ticket className="h-3.5 w-3.5" /> {booked} booked · {remaining} available
            </span>
            {!disabled && <span className="font-bold text-maroon-deep">{selected ? 'Selected' : 'Select slot'}</span>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-navy-50 px-4 py-3">
        <p className="text-sm font-semibold text-navy-900">Choose one daily darshan slot</p>
        <p className="text-xs text-navy-900/60">Availability updates from current bookings</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <span className="flex items-center gap-2 text-xs text-navy-900/60">
          <span className="h-3 w-3 rounded-t-sm bg-emerald-500" /> Available
          <span className="ml-3 h-3 w-3 rounded-t-sm bg-slate-400" /> Booked
        </span>
        <span className="text-right text-[11px] text-navy-900/45">Seat graphic shows counts only; seats are not assigned.</span>
      </div>

      {dates.map((date) => {
        const day = grouped[date];
        const dateObj = new Date(`${date}T00:00:00`);
        const currentDate = new Date(now);
        const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const isToday = date === today;
        return (
          <section key={date} className="overflow-hidden rounded-2xl border border-gold-200 bg-cream/60">
            <div className="flex items-center justify-between border-b border-gold-100 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-bold text-navy-900">
                  {dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <p className="text-xs text-navy-900/55">2 slots · 7:00–8:00 AM and 7:00–8:00 PM</p>
              </div>
              {isToday && <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[10px] font-bold uppercase text-maroon-deep">Today</span>}
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
              {renderSession(day.morning, 'morning')}
              {renderSession(day.evening, 'evening')}
            </div>
          </section>
        );
      })}

      <div className="flex items-start gap-2 rounded-lg bg-cream px-4 py-3 text-xs text-navy-900/60">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        {isSenior
          ? 'Showing the reserved senior quota. Your eligibility will be verified by the temple administrator.'
          : 'Showing general-entry availability. Senior citizens use their separate reserved quota.'}
      </div>
    </div>
  );
}
