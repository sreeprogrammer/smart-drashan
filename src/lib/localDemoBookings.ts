import type { BookingWithDetails } from '@/lib/supabase';

const STORAGE_KEY = 'smart-darshan-local-demo-bookings-v2';
const DAY_VISITOR_TOTALS = [64, 96, 142, 78, 126, 184, 218];
const TEMPLE_NAMES = [
  { temple: 'Meenakshi Amman Temple', district: 'Madurai' },
  { temple: 'Kapaleeshwarar Temple', district: 'Chennai' },
  { temple: 'Brihadeeswarar Temple', district: 'Thanjavur' },
  { temple: 'Ramanathaswamy Temple', district: 'Ramanathapuram' },
];
const VISITOR_NAMES = ['Arun Kumar', 'Meena Devi', 'Karthik Raj', 'Priya Lakshmi', 'Suresh Babu', 'Anitha R'];

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDemoBooking(dayOffset: number, entryIndex: number, category: 'local' | 'special', visitorCount: number): BookingWithDetails {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  const slotDate = localDate(date);
  const createdAt = new Date(Date.now() - (dayOffset + entryIndex) * 60 * 60 * 1000).toISOString();
  const id = `local-demo-${crypto.randomUUID()}`;
  const temple = TEMPLE_NAMES[(dayOffset + entryIndex) % TEMPLE_NAMES.length];
  const isSpecial = category === 'special';
  const isEvening = entryIndex === 1 || (dayOffset === 0 && entryIndex === 0);
  const startTime = isEvening ? '19:00:00' : '07:00:00';

  return {
    id,
    booking_ref: `SD-${isSpecial ? 'SPECIAL' : 'LOCAL'}-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    user_id: 'local-demo-visitor',
    temple_id: `local-demo-temple-${(dayOffset + entryIndex) % TEMPLE_NAMES.length}`,
    slot_id: `local-demo-slot-${slotDate}-${entryIndex}`,
    category_type: category,
    visitor_name: VISITOR_NAMES[(dayOffset * 2 + entryIndex) % VISITOR_NAMES.length],
    visitor_mobile: `+9190000000${String(dayOffset * 2 + entryIndex + 1).padStart(2, '0')}`,
    date_of_birth: null,
    is_senior: false,
    aadhaar_masked: null,
    aadhaar_verification_status: isSpecial ? 'not_required' : 'pending',
    residency_verification_status: isSpecial ? 'pending' : 'not_required',
    visitor_count: visitorCount,
    total_price: isSpecial ? visitorCount * 500 : 0,
    payment_status: isSpecial ? 'pending' : 'not_required',
    booking_status: isSpecial || dayOffset % 3 === 0 ? 'pending' : 'confirmed',
    admin_remarks: null,
    rejection_reason: null,
    verified_by: null,
    verified_at: null,
    darshan_date: slotDate,
    created_at: createdAt,
    updated_at: createdAt,
    temple_name: temple.temple,
    district_name: temple.district,
    slot_date: slotDate,
    session_type: isEvening ? 'evening' : 'morning',
    slot_start_time: startTime,
    slot_end_time: isEvening ? '20:00:00' : '08:00:00',
  };
}

function createSeedBookings(): BookingWithDetails[] {
  return DAY_VISITOR_TOTALS.flatMap((total, dayOffset) => {
    const specialVisitors = Math.ceil(total * 0.6);
    return [
      buildDemoBooking(dayOffset, 0, 'special', specialVisitors),
      buildDemoBooking(dayOffset, 1, 'local', total - specialVisitors),
    ];
  });
}

function writeBookings(bookings: BookingWithDetails[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function getLocalDemoBookings(): BookingWithDetails[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seed = createSeedBookings();
    writeBookings(seed);
    return seed;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error('Local demo bookings are corrupted. Clear this browser’s local demo data and try again.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Local demo bookings have an invalid format. Clear this browser’s local demo data and try again.');
  }
  return parsed as BookingWithDetails[];
}

export function saveLocalDemoBooking(booking: BookingWithDetails) {
  const bookings = getLocalDemoBookings();
  writeBookings([booking, ...bookings.filter((item) => item.id !== booking.id)]);
}

export function cancelLocalDemoBooking(bookingId: string): BookingWithDetails {
  const bookings = getLocalDemoBookings();
  let cancelledBooking: BookingWithDetails | undefined;
  const updated = bookings.map((booking) => {
    if (booking.id !== bookingId) return booking;
    cancelledBooking = {
      ...booking,
      booking_status: 'cancelled',
      updated_at: new Date().toISOString(),
    };
    return cancelledBooking;
  });
  if (!cancelledBooking) throw new Error('The local demo booking could not be found.');
  writeBookings(updated);
  return cancelledBooking;
}

export function updateLocalDemoBooking(
  bookingId: string,
  status: 'confirmed' | 'rejected' | 'completed',
  remarks: string,
): BookingWithDetails {
  const bookings = getLocalDemoBookings();
  let updatedBooking: BookingWithDetails | undefined;
  const updated = bookings.map((booking) => {
    if (booking.id !== bookingId) return booking;
    updatedBooking = {
      ...booking,
      booking_status: status,
      admin_remarks: status === 'rejected' ? booking.admin_remarks : remarks || 'Approved in local demo mode.',
      rejection_reason: status === 'rejected' ? remarks : null,
      payment_status: status === 'confirmed' && booking.category_type === 'special' ? 'paid' : booking.payment_status,
      residency_verification_status: status === 'confirmed' && booking.category_type === 'special'
        ? 'approved'
        : booking.residency_verification_status,
      verified_by: 'local-demo-admin',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return updatedBooking;
  });
  if (!updatedBooking) throw new Error('The local demo booking could not be found.');
  writeBookings(updated);
  return updatedBooking;
}

export function findLocalDemoBookingByReference(reference: string) {
  const normalized = reference.trim().toUpperCase();
  return getLocalDemoBookings().find((booking) => booking.booking_ref.toUpperCase() === normalized) ?? null;
}

export function getDaywiseCrowdForecast(bookings: BookingWithDetails[]) {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const dateKey = localDate(date);
    const dayBookings = bookings.filter((booking) =>
      booking.darshan_date === dateKey
      && booking.booking_status !== 'rejected'
      && booking.booking_status !== 'cancelled',
    );
    const visitors = dayBookings.reduce((total, booking) => total + booking.visitor_count, 0);
    const crowdLevel = visitors >= 175 ? 'Very high' : visitors >= 125 ? 'High' : visitors >= 75 ? 'Moderate' : 'Low';

    return {
      date: dateKey,
      label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      bookingCount: dayBookings.length,
      visitors,
      crowdLevel,
      barWidth: Math.min(100, Math.round((visitors / 240) * 100)),
    };
  });
}
