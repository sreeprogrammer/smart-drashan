import { Building2, Bus, CalendarDays, Clock, Hotel, Phone, Siren, Users } from 'lucide-react';
import type { TempleInformation, TempleInformationSection as SectionKey } from '@/lib/supabase';

export const TEMPLE_INFORMATION_SECTIONS: Array<{
  id: SectionKey;
  title: string;
  icon: typeof Phone;
}> = [
  { id: 'administration', title: 'Temple Administration', icon: Users },
  { id: 'facilities', title: 'Facilities', icon: Building2 },
  { id: 'transportation', title: 'Transportation', icon: Bus },
  { id: 'emergency', title: 'Emergency Services', icon: Siren },
  { id: 'hotels', title: 'Nearby Hotels', icon: Hotel },
  { id: 'timings', title: 'Darshan Timings', icon: Clock },
  { id: 'festivals', title: 'Festivals & Events', icon: CalendarDays },
];

const DEMO_VALUE = 'Demo placeholder — replace with temple-specific, source-verified information.';

const DEMO_DETAILS: Record<SectionKey, Record<string, unknown>> = {
  administration: {
    managing_authority: DEMO_VALUE,
    executive_officer: DEMO_VALUE,
    hr_administrative_office: DEMO_VALUE,
    maintenance_authority: DEMO_VALUE,
    official_contact_number: DEMO_VALUE,
    official_website: DEMO_VALUE,
    administrative_office_address: DEMO_VALUE,
  },
  facilities: {
    drinking_water: DEMO_VALUE,
    toilets: DEMO_VALUE,
    wheelchair_accessibility: DEMO_VALUE,
    senior_citizen_facilities: DEMO_VALUE,
    parking: DEMO_VALUE,
    cloakroom: DEMO_VALUE,
    resting_areas: DEMO_VALUE,
    annadhanam: DEMO_VALUE,
    shoe_storage: DEMO_VALUE,
    queue_facilities: DEMO_VALUE,
    drinking_water_points: DEMO_VALUE,
    accommodation: DEMO_VALUE,
  },
  transportation: {
    nearest_railway_station: DEMO_VALUE,
    railway_station_distance: DEMO_VALUE,
    nearest_bus_stand: DEMO_VALUE,
    bus_stand_distance: DEMO_VALUE,
    nearest_airport: DEMO_VALUE,
    airport_distance: DEMO_VALUE,
    local_bus_availability: DEMO_VALUE,
    taxi_auto_availability: DEMO_VALUE,
    road_connectivity: DEMO_VALUE,
    google_maps_url: DEMO_VALUE,
  },
  emergency: {
    nearest_government_hospital: DEMO_VALUE,
    hospital_address: DEMO_VALUE,
    hospital_phone_number: DEMO_VALUE,
    nearest_police_station: DEMO_VALUE,
    police_station_contact: DEMO_VALUE,
    fire_and_rescue_services: DEMO_VALUE,
    ambulance_108: DEMO_VALUE,
    temple_emergency_contact: DEMO_VALUE,
    pilgrim_emergency_instructions: DEMO_VALUE,
  },
  hotels: {
    items: [{
      hotel_name: 'Demo placeholder — no real hotel information is provided.',
      note: DEMO_VALUE,
    }],
  },
  timings: {
    morning_opening_time: DEMO_VALUE,
    morning_darshan_time: DEMO_VALUE,
    afternoon_closing_time: DEMO_VALUE,
    evening_opening_time: DEMO_VALUE,
    evening_darshan_time: DEMO_VALUE,
    night_closing_time: DEMO_VALUE,
    special_darshan_timings: DEMO_VALUE,
    pooja_timings: DEMO_VALUE,
    festival_day_timing_changes: DEMO_VALUE,
    weekly_holidays: DEMO_VALUE,
  },
  festivals: {
    items: [{
      festival_name: 'Demo placeholder — no festival or event is being announced.',
      note: DEMO_VALUE,
    }],
  },
};

export function createDemoTempleInformation(templeId: string): TempleInformation[] {
  return TEMPLE_INFORMATION_SECTIONS.map(({ id }) => ({
    id: `demo-${templeId}-${id}`,
    temple_id: templeId,
    section: id,
    details: DEMO_DETAILS[id],
    source_url: null,
    status: 'pending',
    last_verified: null,
    submitted_by: null,
    reviewed_by: null,
    review_notes: null,
    created_at: '',
    updated_at: '',
  }));
}
