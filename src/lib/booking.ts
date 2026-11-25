import { supabase } from './supabase';
import type { Booking, SlotAvailability, BookingWithDetails } from './supabase';

export interface BookSlotParams {
  temple_id: string;
  slot_id: string;
  category_type: 'local' | 'special';
  visitor_name: string;
  visitor_mobile: string;
  date_of_birth: string | null;
  is_senior: boolean;
  aadhaar_masked: string | null;
  visitor_count: number;
  total_price: number;
}

export function isSlotPast(slot: Pick<SlotAvailability, 'slot_date' | 'slot_start_time'>, now = Date.now()): boolean {
  const [year, month, day] = slot.slot_date.split('-').map(Number);
  const [hours, minutes, seconds = 0] = slot.slot_start_time.split(':').map(Number);
  const startTime = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
  return startTime <= now;
}

export async function bookSlot(params: BookSlotParams) {
  const { data, error } = await supabase.rpc('book_darshan_slot', {
    p_temple_id: params.temple_id,
    p_slot_id: params.slot_id,
    p_category_type: params.category_type,
    p_visitor_name: params.visitor_name,
    p_visitor_mobile: params.visitor_mobile,
    p_date_of_birth: params.date_of_birth,
    p_is_senior: params.is_senior,
    p_aadhaar_masked: params.aadhaar_masked,
    p_visitor_count: params.visitor_count,
    p_total_price: params.total_price,
  });
  if (error) throw error;
  return data as { success: boolean; booking_id?: string; booking_ref?: string; error?: string };
}

export async function cancelBookingById(bookingId: string) {
  const { data, error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId });
  if (error) throw error;
  const result = data as { success?: boolean; error?: string } | null;
  if (!result?.success) throw new Error(result?.error || 'Cancellation failed');
  return result as { success: boolean; error?: string };
}

export async function adminApprove(bookingId: string, remarks: string) {
  const { data, error } = await supabase.rpc('admin_approve_booking', {
    p_booking_id: bookingId,
    p_remarks: remarks,
  });
  if (error) throw error;
  return data as { success: boolean; new_status?: string; error?: string };
}

export async function adminReject(bookingId: string, reason: string) {
  const { data, error } = await supabase.rpc('admin_reject_booking', {
    p_booking_id: bookingId,
    p_rejection_reason: reason,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string };
}

export async function validateTicketById(bookingId: string) {
  const { data, error } = await supabase.rpc('validate_ticket', { p_booking_id: bookingId });
  if (error) throw error;
  return data as { success: boolean; is_valid?: boolean; error?: string; message?: string };
}

export async function fetchSlotsForTemple(
  templeId: string,
  categoryType: 'local' | 'special'
): Promise<SlotAvailability[]> {
  const today = new Date();
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const lastDate = new Date(today);
  lastDate.setDate(lastDate.getDate() + 2);

  const { data, error } = await supabase
    .from('slot_availability_view')
    .select('*')
    .eq('temple_id', templeId)
    .eq('category_type', categoryType)
    .gte('slot_date', formatLocalDate(today))
    .lte('slot_date', formatLocalDate(lastDate))
    .order('slot_date', { ascending: true })
    .order('slot_start_time', { ascending: true });
  if (error) throw error;
  return (data || []) as SlotAvailability[];
}

export async function fetchUserBookings(): Promise<BookingWithDetails[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      temples(name),
      darshan_slots(slot_date, session_type, slot_start_time, slot_end_time)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown as Booking[]).map((b) => {
    const temple = (b as unknown as Record<string, unknown>).temples as { name: string } | null;
    const slot = (b as unknown as Record<string, unknown>).darshan_slots as {
      slot_date: string; session_type: string; slot_start_time: string; slot_end_time: string;
    } | null;
    return {
      ...b,
      temple_name: temple?.name,
      slot_date: slot?.slot_date,
      session_type: slot?.session_type,
      slot_start_time: slot?.slot_start_time,
      slot_end_time: slot?.slot_end_time,
    } as BookingWithDetails;
  });
}

export async function fetchAllBookingsForAdmin(): Promise<BookingWithDetails[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      temples(name, districts(name)),
      darshan_slots(slot_date, session_type, slot_start_time, slot_end_time)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown as Booking[]).map((b) => {
    const temple = (b as unknown as Record<string, unknown>).temples as {
      name: string; districts: { name: string } | null;
    } | null;
    const slot = (b as unknown as Record<string, unknown>).darshan_slots as {
      slot_date: string; session_type: string; slot_start_time: string; slot_end_time: string;
    } | null;
    return {
      ...b,
      temple_name: temple?.name,
      district_name: temple?.districts?.name,
      slot_date: slot?.slot_date,
      session_type: slot?.session_type,
      slot_start_time: slot?.slot_start_time,
      slot_end_time: slot?.slot_end_time,
    } as BookingWithDetails;
  });
}

export async function fetchAuditLogs(bookingId: string) {
  const { data, error } = await supabase
    .from('booking_audit_logs')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function checkIsAdmin() {
  const { data, error } = await supabase
    .from('temple_admins')
    .select('*')
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function fetchUpcomingSlotsForTemple(templeId: string): Promise<SlotAvailability[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('slot_availability_view')
    .select('*')
    .eq('temple_id', templeId)
    .gte('slot_date', today)
    .order('slot_date', { ascending: true })
    .order('slot_start_time', { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as SlotAvailability[];
}

export async function setSlotClosed(slotId: string, closed: boolean) {
  const { data, error } = await supabase.rpc('admin_set_slot_closed', {
    p_slot_id: slotId,
    p_closed: closed,
  });
  if (error) throw error;
  return data as { success: boolean; is_closed?: boolean; error?: string };
}

export async function fetchSeniorMinAge(templeId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_senior_min_age', { p_temple_id: templeId });
  if (error) throw error;
  return typeof data === 'number' ? data : null;
}

export async function setSeniorMinAge(templeId: string, minAge: number) {
  const { data, error } = await supabase.rpc('admin_set_senior_min_age', {
    p_temple_id: templeId,
    p_min_age: minAge,
  });
  if (error) throw error;
  return data as { success: boolean; senior_min_age?: number; error?: string };
}

export function maskAadhaar(fullAadhaar: string): string {
  const digits = fullAadhaar.replace(/\D/g, '');
  if (digits.length !== 12) return '';
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
