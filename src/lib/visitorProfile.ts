import { supabase } from '@/lib/supabase';

export interface VisitorProfile {
  user_id: string;
  full_name: string;
  email: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  state: string;
  district_id: string;
  address: string;
  place: string | null;
  city: string | null;
  country: string | null;
  pincode: string | null;
  phone: string;
  account_type: 'visitor' | 'local_resident' | 'special_assistance';
  phone_verified: boolean;
  accepted_terms_at: string;
}

const DEMO_PROFILE_STORAGE_KEY = 'smart-darshan-local-demo-profiles-v1';

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const localNumber = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^\d{10}$/.test(localNumber)) {
    throw new Error('A valid 10-digit mobile number is required.');
  }
  return localNumber;
}

function readDemoProfiles(): Record<string, VisitorProfile> {
  const stored = localStorage.getItem(DEMO_PROFILE_STORAGE_KEY);
  if (!stored) return {};
  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Local visitor profile data is invalid. Clear the demo profile storage and try again.');
  }
  return parsed as Record<string, VisitorProfile>;
}

export function getLocalDemoVisitorProfile(phone: string): VisitorProfile | null {
  const profiles = readDemoProfiles();
  return profiles[normalizePhone(phone)] ?? null;
}

export function saveLocalDemoVisitorProfile(phone: string, profile: VisitorProfile) {
  const profiles = readDemoProfiles();
  profiles[normalizePhone(phone)] = profile;
  localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

export function isVisitorProfileComplete(profile: VisitorProfile | null): profile is VisitorProfile {
  return !!profile
    && typeof profile.age === 'number'
    && profile.age >= 0
    && profile.age <= 120
    && typeof profile.full_name === 'string'
    && !!profile.full_name.trim()
    && typeof profile.place === 'string'
    && !!profile.place.trim()
    && typeof profile.city === 'string'
    && !!profile.city.trim()
    && typeof profile.state === 'string'
    && !!profile.state.trim()
    && typeof profile.country === 'string'
    && !!profile.country.trim()
    && typeof profile.pincode === 'string'
    && /^\d{6}$/.test(profile.pincode)
    && typeof profile.phone === 'string'
    && !!profile.phone.trim()
    && typeof profile.district_id === 'string'
    && !!profile.district_id
    && typeof profile.address === 'string'
    && !!profile.address.trim()
    && profile.phone_verified;
}

export async function loadVisitorProfile(
  userId: string,
  phone: string,
  isDemoMode: boolean,
): Promise<{ profile: VisitorProfile | null; error: string | null }> {
  if (isDemoMode) {
    try {
      return { profile: getLocalDemoVisitorProfile(phone), error: null };
    } catch {
      return { profile: null, error: 'Your local visitor profile could not be loaded. Please try again.' };
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email, date_of_birth, age, gender, state, district_id, address, place, city, country, pincode, account_type, phone_verified, accepted_terms_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { profile: null, error: 'Your profile could not be checked. Apply the latest database migration and try again.' };
    }

    return {
      profile: data ? { ...data, phone } as VisitorProfile : null,
      error: null,
    };
  } catch {
    return { profile: null, error: 'Your profile could not be checked. Check your connection and try again.' };
  }
}
