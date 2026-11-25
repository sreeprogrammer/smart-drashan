import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isVisitorProfileComplete, loadVisitorProfile } from '@/lib/visitorProfile';
import { supabase } from '@/lib/supabase';

type DistrictOption = { id: string; name: string; tamil_name: string | null };
type AccountType = 'visitor' | 'local_resident' | 'special_assistance';

interface VisitorProfileCompletionProps {
  userId: string;
  phone: string;
  isDemoMode: boolean;
  onCompleted: () => void;
}

const inputClassName =
  'w-full rounded-lg border border-navy-200 bg-white px-4 py-3 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30';

export default function VisitorProfileCompletion({
  userId,
  phone,
  isDemoMode,
  onCompleted,
}: VisitorProfileCompletionProps) {
  const { user, createVisitorProfile } = useAuth();
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [districtError, setDistrictError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState({
    fullName: String(user?.user_metadata?.full_name ?? ''),
    email: String(user?.user_metadata?.email ?? ''),
    age: String(user?.user_metadata?.age ?? ''),
    place: String(user?.user_metadata?.place ?? ''),
    city: String(user?.user_metadata?.city ?? ''),
    state: String(user?.user_metadata?.state ?? 'Tamil Nadu'),
    country: String(user?.user_metadata?.country ?? 'India'),
    pincode: String(user?.user_metadata?.pincode ?? ''),
    districtId: '',
    gender: '',
    accountType: 'visitor' as AccountType,
    acceptedTerms: false,
  });

  useEffect(() => {
    let active = true;
    supabase
      .from('districts')
      .select('id, name, tamil_name')
      .order('name')
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setDistrictError('Districts could not be loaded. Please refresh and try again.');
        } else {
          setDistricts((data ?? []) as DistrictOption[]);
        }
        setDistrictsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setDistrictError('Districts could not be loaded. Please refresh and try again.');
        setDistrictsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    loadVisitorProfile(userId, phone, isDemoMode).then(({ profile, error: profileError }) => {
      if (!active) return;
      if (profileError) {
        setError(profileError);
        setProfileLoading(false);
        return;
      }
      if (!profile) {
        setProfileLoading(false);
        return;
      }
      if (isVisitorProfileComplete(profile)) {
        setProfileLoading(false);
        onCompleted();
        return;
      }
      setDetails((current) => ({
        ...current,
        fullName: profile.full_name,
        email: profile.email ?? '',
        age: profile.age === null ? current.age : String(profile.age),
        place: profile.place ?? '',
        city: profile.city ?? '',
        state: profile.state,
        country: profile.country ?? '',
        pincode: profile.pincode ?? '',
        districtId: profile.district_id,
        gender: profile.gender ?? '',
        accountType: profile.account_type,
        acceptedTerms: true,
      }));
      setProfileLoading(false);
    }).catch(() => {
      if (active) {
        setError('Your profile could not be checked. Please try again.');
        setProfileLoading(false);
      }
    });
    return () => { active = false; };
  }, [userId, phone, isDemoMode, onCompleted]);

  const updateField = <K extends keyof typeof details>(field: K, value: (typeof details)[K]) => {
    setDetails((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const age = Number(details.age);
    if (details.fullName.trim().length < 2) return setError('Please enter your full name.');
    if (!Number.isInteger(age) || age < 0 || age > 120) return setError('Please enter a valid age between 0 and 120.');
    if (!details.place.trim() || !details.city.trim() || !details.state.trim() || !details.country.trim()) {
      return setError('Please complete your place, city, state, and country.');
    }
    if (!/^\d{6}$/.test(details.pincode)) return setError('Please enter a valid 6-digit PIN code.');
    if (!details.districtId) return setError('Please select your home district.');
    if (!details.acceptedTerms) return setError('Please accept the Terms and Privacy Policy.');

    setLoading(true);
    try {
      const result = await createVisitorProfile({
        fullName: details.fullName.trim(),
        email: details.email.trim(),
        age,
        gender: details.gender,
        districtId: details.districtId,
        place: details.place.trim(),
        city: details.city.trim(),
        state: details.state.trim(),
        country: details.country.trim(),
        pincode: details.pincode,
        accountType: details.accountType,
        acceptedTerms: details.acceptedTerms,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onCompleted();
    } catch {
      setError('Your profile could not be saved. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-gold-200 bg-white p-5 text-left shadow-sm sm:p-6">
      <h2 className="font-serif text-xl font-bold text-navy-900">Complete your profile to continue</h2>
      <p className="mt-1 text-sm text-navy-900/70">Your phone has been verified. Add these details to finish signing in.</p>
      {isDemoMode && (
        <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Local demo profile data is saved in this browser only.
        </p>
      )}
      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {districtError && <p role="alert" className="mt-4 text-sm text-red-800">{districtError}</p>}

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy-900">
          Name
          <input required maxLength={120} autoComplete="name" value={details.fullName} onChange={(event) => updateField('fullName', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          Age
          <input required type="number" min={0} max={120} value={details.age} onChange={(event) => updateField('age', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          Verified phone number
          <input readOnly value={phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')} className={`${inputClassName} mt-1.5 bg-cream font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          Email (optional)
          <input type="email" autoComplete="email" value={details.email} onChange={(event) => updateField('email', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          Place / locality
          <input required maxLength={120} autoComplete="address-line1" value={details.place} onChange={(event) => updateField('place', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          City
          <input required maxLength={120} autoComplete="address-level2" value={details.city} onChange={(event) => updateField('city', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          State
          <input required maxLength={120} autoComplete="address-level1" value={details.state} onChange={(event) => updateField('state', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          Country
          <input required maxLength={120} autoComplete="country-name" value={details.country} onChange={(event) => updateField('country', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          PIN code
          <input required inputMode="numeric" autoComplete="postal-code" maxLength={6} value={details.pincode} onChange={(event) => updateField('pincode', event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClassName} mt-1.5 font-normal`} />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          Home district
          <select required disabled={districtsLoading || !!districtError} value={details.districtId} onChange={(event) => updateField('districtId', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`}>
            <option value="">{districtsLoading ? 'Loading districts…' : 'Select your district'}</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>{district.name}{district.tamil_name ? ` · ${district.tamil_name}` : ''}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy-900">
          Gender (optional)
          <select value={details.gender} onChange={(event) => updateField('gender', event.target.value)} className={`${inputClassName} mt-1.5 font-normal`}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy-900">
          Account type
          <select value={details.accountType} onChange={(event) => updateField('accountType', event.target.value as AccountType)} className={`${inputClassName} mt-1.5 font-normal`}>
            <option value="visitor">Devotee / Visitor</option>
            <option value="local_resident">Local Resident (verification required)</option>
            <option value="special_assistance">Special Assistance Applicant</option>
          </select>
        </label>
        <label className="flex items-start gap-3 text-sm font-normal text-navy-900/75 sm:col-span-2">
          <input type="checkbox" required checked={details.acceptedTerms} onChange={(event) => updateField('acceptedTerms', event.target.checked)} className="mt-1 h-4 w-4 accent-maroon-800" />
          <span>I agree to the Terms and Conditions and Privacy Policy.</span>
        </label>
        <button type="submit" disabled={loading || profileLoading || districtsLoading || !!districtError} className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
          {(loading || profileLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
          {profileLoading ? 'Checking profile…' : loading ? 'Saving profile…' : 'Finish sign-in'}
        </button>
      </form>
    </div>
  );
}
