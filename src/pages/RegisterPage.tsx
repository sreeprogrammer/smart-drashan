import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { useAuth } from '@/lib/auth';
import { getDevelopmentOtpPreview } from '@/lib/devOtp';
import { isVisitorProfileComplete, loadVisitorProfile } from '@/lib/visitorProfile';
import { supabase } from '@/lib/supabase';

type RegistrationDetails = {
  name: string;
  email: string;
  age: string;
  gender: string;
  districtId: string;
  place: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  accountType: 'visitor' | 'local_resident' | 'special_assistance';
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

type DistrictOption = { id: string; name: string; tamil_name: string | null };

const initialDetails: RegistrationDetails = {
  name: '',
  email: '',
  age: '',
  gender: '',
  districtId: '',
  place: '',
  city: '',
  state: 'Tamil Nadu',
  country: 'India',
  pincode: '',
  accountType: 'visitor',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
};

const inputClassName =
  'w-full rounded-lg border border-navy-200 bg-white px-4 py-3 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30';

function phoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
}

export default function RegisterPage() {
  const { signUp, verifyOtp, createVisitorProfile, user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [details, setDetails] = useState(initialDetails);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtError, setDistrictError] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'otp' | 'complete'>('details');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [developmentOtp, setDevelopmentOtp] = useState<string | null>(null);

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
          setDistrictError(null);
        }
        setDistrictsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const phone = user.phone || String(user.user_metadata?.demo_phone ?? '');
    setDetails((current) => ({
      ...current,
      name: current.name || String(user.user_metadata?.full_name ?? ''),
      email: current.email || String(user.user_metadata?.email ?? ''),
      phone: current.phone || phoneDigits(phone),
      age: current.age || String(user.user_metadata?.age ?? ''),
      place: current.place || String(user.user_metadata?.place ?? ''),
      city: current.city || String(user.user_metadata?.city ?? ''),
      state: current.state || String(user.user_metadata?.state ?? 'Tamil Nadu'),
      country: current.country || String(user.user_metadata?.country ?? 'India'),
      pincode: current.pincode || String(user.user_metadata?.pincode ?? ''),
    }));

    loadVisitorProfile(user.id, phone, isDemoMode).then(({ profile, error: profileError }) => {
      if (!active) return;
      if (profileError) {
        setError(profileError);
        return;
      }
      if (!profile) return;

      setDetails((current) => ({
        ...current,
        name: profile.full_name,
        email: profile.email ?? '',
        age: profile.age === null ? current.age : String(profile.age),
        gender: profile.gender ?? '',
        districtId: profile.district_id,
        place: profile.place ?? '',
        city: profile.city ?? '',
        state: profile.state,
        country: profile.country ?? '',
        pincode: profile.pincode ?? '',
        phone: phoneDigits(profile.phone),
        accountType: profile.account_type,
        acceptedTerms: true,
      }));
      if (isVisitorProfileComplete(profile)) setStep('complete');
    }).catch(() => {
      if (active) setError('Your profile could not be checked. Please try again.');
    });

    return () => { active = false; };
  }, [user, isDemoMode]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const updateField = <K extends keyof RegistrationDetails>(field: K, value: RegistrationDetails[K]) => {
    setDetails((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    const result = await createVisitorProfile({
      fullName: details.name.trim(),
      email: details.email.trim(),
      age: Number(details.age),
      gender: details.gender,
      districtId: details.districtId,
      place: details.place.trim(),
      city: details.city.trim(),
      state: details.state.trim(),
      country: details.country.trim(),
      pincode: details.pincode.trim(),
      accountType: details.accountType,
      acceptedTerms: details.acceptedTerms,
    });
    if (result.error) {
      setError(result.error);
      return false;
    }
    setStep('complete');
    return true;
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (details.name.trim().length < 2) return setError('Please enter your full name.');
    if (!user && details.phone.length !== 10) return setError('Please enter a valid 10-digit phone number.');
    if (!user && details.password.length < 6) return setError('Your password must be at least 6 characters.');
    if (!user && details.password !== details.confirmPassword) return setError('The passwords do not match.');
    const age = Number(details.age);
    if (!Number.isInteger(age) || age < 0 || age > 120) return setError('Please enter a valid age between 0 and 120.');
    if (!details.districtId) return setError('Please select your district.');
    if (!details.place.trim() || !details.city.trim() || !details.state.trim() || !details.country.trim()) {
      return setError('Please complete your place, city, state, and country.');
    }
    if (!/^\d{6}$/.test(details.pincode)) return setError('Please enter a valid 6-digit PIN code.');
    if (!details.acceptedTerms) return setError('Please accept the Terms and Privacy Policy.');

    setLoading(true);
    if (user) {
      await saveProfile();
      setLoading(false);
      return;
    }

    const result = await signUp({
      ...details,
      name: details.name.trim(),
      email: details.email.trim(),
      age,
      place: details.place.trim(),
      city: details.city.trim(),
      state: details.state.trim(),
      country: details.country.trim(),
      pincode: details.pincode.trim(),
      phone: `+91${details.phone}`,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    if (result.needsPhoneConfirmation) {
      setDevelopmentOtp(getDevelopmentOtpPreview(`+91${details.phone}`));
      setStep('otp');
      setResendSeconds(30);
      setLoading(false);
      return;
    }

    await saveProfile();
    setLoading(false);
  };

  const handleVerifyPhoneOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code sent to your mobile number.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await verifyOtp(`+91${details.phone}`, otp);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    await saveProfile();
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0) return;
    setError(null);
    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'sms',
        phone: `+91${details.phone}`,
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setResendSeconds(30);
      }
    } catch {
      setError('The OTP could not be resent. Check your connection and SMS provider configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-maroon-deep">
              <UserPlus className="h-7 w-7" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-600">Smart Darshan account</p>
            <h1 className="font-serif text-3xl font-bold text-navy-900 sm:text-4xl">{user ? 'Complete Your Visitor Profile' : 'Create Your Smart Darshan Account'}</h1>
            <p className="mt-3 text-sm text-navy-900/70">தமிழ் நாடு கோயில் தரிசனத்திற்கு உங்கள் கணக்கை உருவாக்குங்கள்.</p>
          </div>

          <div className="rounded-2xl border border-gold-200 bg-white p-6 shadow-sm sm:p-8">
            {error && (
              <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {districtError && (
              <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {districtError}
              </div>
            )}
            {isDemoMode && user && (
              <p role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Local demo profile data is saved in this browser only.
              </p>
            )}

            {step === 'details' && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-navy-900">Full name / முழுப் பெயர்</label>
                    <input id="register-name" autoComplete="name" required maxLength={120} value={details.name} onChange={(e) => updateField('name', e.target.value)} className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="register-age" className="mb-2 block text-sm font-semibold text-navy-900">Age</label>
                    <input id="register-age" type="number" inputMode="numeric" min={0} max={120} required value={details.age} onChange={(e) => updateField('age', e.target.value)} className={inputClassName} />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="register-phone" className="mb-2 block text-sm font-semibold text-navy-900">Mobile number / கைபேசி எண்</label>
                    <div className="flex overflow-hidden rounded-lg border border-navy-200 focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-400/30">
                      <span className="flex items-center border-r border-navy-200 bg-cream px-3 text-sm text-navy-900/70">+91</span>
                      <input
                        id="register-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        required
                        readOnly={!!user}
                        value={details.phone}
                        onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="min-w-0 flex-1 px-3 py-3 outline-none read-only:bg-cream"
                      />
                    </div>
                    <p className="mt-1 text-xs text-navy-900/55">{user ? 'This mobile number has been verified.' : 'We’ll verify this number with an SMS OTP.'}</p>
                  </div>
                  <div>
                    <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-navy-900">Email address (optional)</label>
                    <input id="register-email" type="email" autoComplete="email" value={details.email} onChange={(e) => updateField('email', e.target.value)} className={inputClassName} />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="register-place" className="mb-2 block text-sm font-semibold text-navy-900">Place / locality</label>
                    <input id="register-place" autoComplete="address-line1" required maxLength={120} value={details.place} onChange={(e) => updateField('place', e.target.value)} className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="register-city" className="mb-2 block text-sm font-semibold text-navy-900">City</label>
                    <input id="register-city" autoComplete="address-level2" required maxLength={120} value={details.city} onChange={(e) => updateField('city', e.target.value)} className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="register-state" className="mb-2 block text-sm font-semibold text-navy-900">State</label>
                    <input id="register-state" autoComplete="address-level1" required maxLength={120} value={details.state} onChange={(e) => updateField('state', e.target.value)} className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="register-country" className="mb-2 block text-sm font-semibold text-navy-900">Country</label>
                    <input id="register-country" autoComplete="country-name" required maxLength={120} value={details.country} onChange={(e) => updateField('country', e.target.value)} className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="register-pincode" className="mb-2 block text-sm font-semibold text-navy-900">PIN code</label>
                    <input id="register-pincode" type="text" inputMode="numeric" autoComplete="postal-code" required maxLength={6} value={details.pincode} onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="register-district" className="mb-2 block text-sm font-semibold text-navy-900">Home district</label>
                    <select id="register-district" required disabled={districtsLoading || !!districtError} value={details.districtId} onChange={(e) => updateField('districtId', e.target.value)} className={inputClassName}>
                      <option value="">{districtsLoading ? 'Loading districts…' : 'Select your district'}</option>
                      {districts.map((district) => (
                        <option key={district.id} value={district.id}>{district.name}{district.tamil_name ? ` · ${district.tamil_name}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="register-gender" className="mb-2 block text-sm font-semibold text-navy-900">Gender (optional)</label>
                    <select id="register-gender" value={details.gender} onChange={(e) => updateField('gender', e.target.value)} className={inputClassName}>
                      <option value="">Prefer not to say</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="non_binary">Non-binary</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="register-account-type" className="mb-2 block text-sm font-semibold text-navy-900">Account type</label>
                    <select id="register-account-type" value={details.accountType} onChange={(e) => updateField('accountType', e.target.value as RegistrationDetails['accountType'])} className={inputClassName}>
                      <option value="visitor">Devotee / Visitor</option>
                      <option value="local_resident">Local Resident (verification required)</option>
                      <option value="special_assistance">Special Assistance Applicant</option>
                    </select>
                  </div>
                </div>

                {!user && <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-navy-900">Password</label>
                    <input id="register-password" type="password" autoComplete="new-password" required minLength={6} value={details.password} onChange={(e) => updateField('password', e.target.value)} className={inputClassName} />
                    <p className="mt-1.5 text-xs text-navy-900/55">Must be at least 6 characters.</p>
                  </div>
                  <div>
                    <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-semibold text-navy-900">Confirm password</label>
                    <input id="register-confirm-password" type="password" autoComplete="new-password" required minLength={6} value={details.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className={inputClassName} />
                  </div>
                </div>}

                <label className="flex items-start gap-3 text-sm text-navy-900/75">
                  <input type="checkbox" required checked={details.acceptedTerms} onChange={(e) => updateField('acceptedTerms', e.target.checked)} className="mt-1 h-4 w-4 accent-maroon-800" />
                  <span>I agree to the Terms and Conditions and Privacy Policy.</span>
                </label>

                <button type="submit" disabled={loading || districtsLoading || !!districtError} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-maroon-deep to-maroon-800 px-6 py-3 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? (user ? 'Saving profile…' : 'Creating account…') : (user ? 'Save profile' : 'Register')}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-5">
                <div className="text-center">
                  <h2 className="font-serif text-xl font-bold text-navy-900">Verify your mobile number</h2>
                  <p className="mt-2 text-sm text-navy-900/70">
                    Enter the SMS OTP sent to <span className="font-semibold">+91 {details.phone}</span>.
                  </p>
                  <p className="mt-1 text-xs text-navy-900/55">
                    {developmentOtp
                      ? 'This test code is shown only in local development for the configured Supabase test phone.'
                      : 'The OTP is delivered by your configured Supabase SMS provider and is not exposed by the app.'}
                  </p>
                  {developmentOtp && (
                    <p role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      Local test OTP: <span className="font-mono text-lg font-bold tracking-widest">{developmentOtp}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="register-otp" className="mb-2 block text-sm font-semibold text-navy-900">SMS OTP</label>
                  <input id="register-otp" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClassName} text-center text-2xl tracking-[0.5em]`} />
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold-300 to-gold-500 px-6 py-3 font-bold text-maroon-deep transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Verifying…' : 'Verify OTP and Register'}
                </button>
                <button type="button" onClick={handleResendOtp} disabled={loading || resendSeconds > 0} className="w-full text-sm font-semibold text-maroon-deep disabled:text-navy-900/40">
                  {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : 'Resend OTP'}
                </button>
              </form>
            )}

            {step === 'complete' && (
              <div role="status" className="py-5 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" />
                <h2 className="font-serif text-xl font-bold text-navy-900">Welcome to Smart Darshan, {details.name || user?.user_metadata?.full_name || 'Devotee'}!</h2>
                <p className="mt-2 text-sm text-navy-900/70">Your mobile number is verified and your visitor profile is ready. Continue to your dashboard to explore temples, verification options, and darshan bookings.</p>
                <button type="button" onClick={() => navigate('/dashboard')} className="mt-6 rounded-lg bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800">
                  Go to Visitor Dashboard
                </button>
              </div>
            )}

            {step === 'details' && (
              <p className="mt-5 text-center text-sm text-navy-900/70">
                Already registered? <Link to="/signin" className="font-semibold text-maroon-deep hover:underline">Sign in</Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
