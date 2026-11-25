import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface District {
  id: string;
  name: string;
  tamil_name: string;
  region: string;
  description: string;
  history: string | null;
  cultural_significance: string | null;
  area_sq_km: number | null;
  formed_year: number | null;
  tourist_attractions: string[];
  cultural_heritage: string[];
  famous_festivals: string[];
  image: string;
  official_website: string | null;
  collector_name: string | null;
  collector_image: string | null;
  collector_designation: string | null;
  collector_contact: string | null;
  verified_at: string | null;
}

export interface Temple {
  id: string;
  district_id: string;
  name: string;
  tamil_name: string | null;
  location: string;
  address: string | null;
  category: string;
  deity: string | null;
  goddess: string | null;
  architecture_style: string | null;
  description: string | null;
  history: string | null;
  historical_significance: string | null;
  religious_significance: string | null;
  latitude: number | null;
  longitude: number | null;
  verification_status: string;
  featured_image: string | null;
}

export interface TempleImage {
  id: string;
  temple_id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  image_type: string | null;
  verified_source: string | null;
}

export interface TempleTiming {
  id: string;
  temple_id: string;
  day_label: string;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
  special_darshan: string | null;
  special_pooja: string | null;
  festival_timing_note: string | null;
  last_verified: string | null;
}

export interface TempleFacility {
  id: string;
  temple_id: string;
  facility_type: string;
  status: string;
}

export interface NearbyService {
  id: string;
  temple_id: string;
  service_type: string;
  service_name: string;
  address: string | null;
  distance_km: number | null;
  contact: string | null;
  additional_info: string | null;
}

export interface TempleEvent {
  id: string;
  temple_id: string;
  event_name: string;
  event_date: string | null;
  description: string | null;
}

export interface NearbyHotel {
  id: string;
  temple_id: string;
  hotel_name: string;
  image: string | null;
  address: string | null;
  distance_km: number | null;
  contact: string | null;
  website: string | null;
  category: string | null;
}

export interface TempleAdministration {
  id: string;
  temple_id: string;
  executive_officer: string | null;
  maintenance_incharge: string | null;
  managing_department: string | null;
  contact_number: string | null;
  official_website: string | null;
  last_verified: string | null;
}

export type TempleInformationSection =
  | 'administration'
  | 'facilities'
  | 'transportation'
  | 'emergency'
  | 'hotels'
  | 'timings'
  | 'festivals';

export type TempleInformationStatus = 'pending' | 'verified' | 'rejected';

export interface TempleInformation {
  id: string;
  temple_id: string;
  section: TempleInformationSection;
  details: Record<string, unknown>;
  source_url: string | null;
  status: TempleInformationStatus;
  last_verified: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TempleWithDistrict extends Temple {
  district?: Pick<District, 'id' | 'name' | 'tamil_name' | 'region'>;
}

export interface DistrictWithTemples extends District {
  temples?: Temple[];
  temple_count?: number;
}

// ============================================================
// Darshan Booking System Types
// ============================================================

export interface DarshanCategory {
  id: string;
  temple_id: string | null;
  category_type: 'local' | 'special';
  price: number;
  total_capacity: number;
  senior_capacity: number;
  senior_min_age: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DarshanSlotConfig {
  id: string;
  temple_id: string;
  category_type: 'local' | 'special';
  session_type: 'morning' | 'evening';
  available_date: string;
  session_start_time: string;
  session_end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DarshanSlot {
  id: string;
  config_id: string | null;
  temple_id: string;
  category_type: 'local' | 'special';
  slot_date: string;
  session_type: 'morning' | 'evening';
  slot_start_time: string;
  slot_end_time: string;
  total_capacity: number;
  senior_capacity: number;
  booked_general: number;
  booked_senior: number;
  is_closed: boolean;
  created_at: string;
}

export interface SlotAvailability {
  slot_id: string;
  temple_id: string;
  category_type: 'local' | 'special';
  slot_date: string;
  session_type: 'morning' | 'evening';
  slot_start_time: string;
  slot_end_time: string;
  total_capacity: number;
  senior_capacity: number;
  booked_general: number;
  booked_senior: number;
  general_remaining: number;
  senior_remaining: number;
  total_remaining: number;
  slot_status: 'available' | 'full' | 'closed';
  is_closed: boolean;
  temple_name: string;
}

export interface Booking {
  id: string;
  booking_ref: string;
  user_id: string;
  temple_id: string;
  slot_id: string;
  category_type: 'local' | 'special';
  visitor_name: string;
  visitor_mobile: string;
  date_of_birth: string | null;
  is_senior: boolean;
  aadhaar_masked: string | null;
  aadhaar_verification_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  residency_verification_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  visitor_count: number;
  total_price: number;
  payment_status: 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded';
  booking_status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  admin_remarks: string | null;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  darshan_date: string;
  created_at: string;
  updated_at: string;
}

export interface BookingWithDetails extends Booking {
  temple_name?: string;
  district_name?: string;
  slot_date?: string;
  session_type?: string;
  slot_start_time?: string;
  slot_end_time?: string;
}

export interface BookingAuditLog {
  id: string;
  booking_id: string;
  action: string;
  performed_by: string | null;
  remarks: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
}

export interface TicketValidation {
  id: string;
  booking_id: string;
  validated_by: string | null;
  validated_at: string;
  is_valid: boolean;
}

export interface TempleAdmin {
  id: string;
  user_id: string;
  temple_id: string | null;
  admin_name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
}
