import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Church, MapPin, Users, Ticket, ShieldCheck,
  Loader2, CheckCircle2, AlertCircle, Clock, IndianRupee,
  User, Phone, Lock, FileText, Info,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import OtpLoginModal from '@/components/OtpLoginModal';
import SlotSelection from '@/components/SlotSelection';
import DigitalTicket from '@/components/DigitalTicket';
import { useAuth } from '@/lib/auth';
import { supabase, type District, type Temple, type SlotAvailability, type BookingWithDetails } from '@/lib/supabase';
import { fetchSlotsForTemple, bookSlot, maskAadhaar, formatTime, formatDate, isSlotPast } from '@/lib/booking';
import { saveLocalDemoBooking } from '@/lib/localDemoBookings';

const STEPS = [
  { id: 1, label: 'District', icon: MapPin },
  { id: 2, label: 'Temple', icon: Church },
  { id: 3, label: 'Category', icon: Ticket },
  { id: 4, label: 'Login', icon: Lock },
  { id: 5, label: 'Details', icon: User },
  { id: 6, label: 'Slot', icon: Clock },
  { id: 7, label: 'Payment', icon: IndianRupee },
  { id: 8, label: 'Ticket', icon: CheckCircle2 },
];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDemoSlots(
  temple: Temple,
  category: 'local' | 'special',
  existingSlots: SlotAvailability[],
): SlotAvailability[] {
  const totalCapacity = category === 'local' ? 100 : 50;
  const seniorCapacity = category === 'local' ? 25 : 0;
  const sessions = [
    { type: 'morning' as const, start: '07:00:00', end: '08:00:00' },
    { type: 'evening' as const, start: '19:00:00', end: '20:00:00' },
  ];
  const slots: SlotAvailability[] = [];

  for (let offset = 0; offset < 3; offset++) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const slotDate = formatLocalDate(date);

    for (const session of sessions) {
      const current = existingSlots.find((slot) =>
        slot.slot_date === slotDate
        && slot.session_type === session.type
        && slot.slot_start_time.startsWith(session.start.slice(0, 5))
        && slot.slot_end_time.startsWith(session.end.slice(0, 5)),
      );
      if (current) {
        slots.push(current);
        continue;
      }

      slots.push({
        slot_id: `demo-${temple.id}-${category}-${slotDate}-${session.type}`,
        temple_id: temple.id,
        category_type: category,
        slot_date: slotDate,
        session_type: session.type,
        slot_start_time: session.start,
        slot_end_time: session.end,
        total_capacity: totalCapacity,
        senior_capacity: seniorCapacity,
        booked_general: 0,
        booked_senior: 0,
        general_remaining: totalCapacity - seniorCapacity,
        senior_remaining: seniorCapacity,
        total_remaining: totalCapacity,
        slot_status: 'available',
        is_closed: false,
        temple_name: temple.name,
      });
    }
  }

  return slots;
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const presetTempleId = searchParams.get('temple');
  const { user, isDemoMode } = useAuth();

  const [step, setStep] = useState(1);
  const [districts, setDistricts] = useState<District[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [filteredTemples, setFilteredTemples] = useState<Temple[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'local' | 'special' | null>(null);

  const [showLogin, setShowLogin] = useState(false);

  // Visitor details
  const [visitorName, setVisitorName] = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const isSenior = false;
  const [aadhaar, setAadhaar] = useState('');
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [aadhaarPdf, setAadhaarPdf] = useState<File | null>(null);
  const aadhaarPdfInput = useRef<HTMLInputElement>(null);
  const [visitorCount, setVisitorCount] = useState(1);

  // Slots
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Booking result
  const [bookingResult, setBookingResult] = useState<{ booking_id: string; booking_ref: string } | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load districts
  useEffect(() => {
    supabase.from('districts').select('*').order('name').then(({ data }) => {
      if (data) setDistricts(data as District[]);
    });
    supabase.from('temples').select('*').order('name').then(({ data }) => {
      if (data) setTemples(data as Temple[]);
    });
  }, []);

  // If temple preset in URL, jump ahead
  useEffect(() => {
    if (presetTempleId && temples.length > 0) {
      const temple = temples.find((t) => t.id === presetTempleId);
      if (temple) {
        setSelectedDistrict(temple.district_id);
        setSelectedTemple(temple);
        setStep(3);
      }
    }
  }, [presetTempleId, temples]);

  // Filter temples by district
  useEffect(() => {
    if (selectedDistrict) {
      setFilteredTemples(temples.filter((t) => t.district_id === selectedDistrict));
    } else {
      setFilteredTemples(temples);
    }
  }, [selectedDistrict, temples]);

  // Load slots when category is selected
  const loadSlots = useCallback(async () => {
    if (!selectedTemple || !selectedCategory) return;
    setSlotsLoading(true);
    try {
      const data = await fetchSlotsForTemple(selectedTemple.id, selectedCategory);
      setSlots(isDemoMode
        ? createDemoSlots(selectedTemple, selectedCategory, data)
        : data);
    } catch {
      setError(isDemoMode
        ? 'Demo slots could not be prepared. Please try again.'
        : 'Failed to load slot availability. Apply the latest slot migration and try again.');
    }
    setSlotsLoading(false);
  }, [selectedTemple, selectedCategory, isDemoMode]);

  useEffect(() => {
    if (step === 6 && selectedTemple && selectedCategory) {
      loadSlots();
    }
  }, [step, selectedTemple, selectedCategory, loadSlots]);

  const handleSelectCategory = (cat: 'local' | 'special') => {
    setSelectedCategory(cat);
    if (cat !== 'local') {
      setAadhaarPdf(null);
      if (aadhaarPdfInput.current) aadhaarPdfInput.current.value = '';
    }
  };

  const handleAadhaarPdfChange = (file: File | undefined) => {
    setError(null);
    if (!file) {
      setAadhaarPdf(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setAadhaarPdf(null);
      if (aadhaarPdfInput.current) aadhaarPdfInput.current.value = '';
      setError('Please choose an Aadhaar document in PDF format.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAadhaarPdf(null);
      if (aadhaarPdfInput.current) aadhaarPdfInput.current.value = '';
      setError('The PDF must be 5 MB or smaller.');
      return;
    }
    setAadhaarPdf(file);
  };

  const handleSelectSlot = (slot: SlotAvailability | null) => {
    setSelectedSlot(slot);
  };

  const handleSubmitBooking = async () => {
    if (!user) {
      setError('Please sign in before submitting your booking.');
      return;
    }
    if (!selectedTemple || !selectedSlot || !selectedCategory) {
      setError('Please select a temple, darshan category, and time slot before submitting.');
      return;
    }
    if (isSlotPast(selectedSlot)) {
      setSelectedSlot(null);
      setError('This slot has already started. Please select a future time slot.');
      return;
    }
    setError(null);
    setSubmitting(true);

    if (isDemoMode) {
      const timestamp = new Date().toISOString();
      const bookingId = crypto.randomUUID();
      const bookingRef = `SD-${selectedCategory === 'local' ? 'LOCAL' : 'SPECIAL'}-DEMO-${bookingId.slice(0, 8).toUpperCase()}`;
      const isLocalBooking = selectedCategory === 'local';
      const demoBooking: BookingWithDetails = {
        id: bookingId,
        booking_ref: bookingRef,
        user_id: user.id,
        temple_id: selectedTemple.id,
        slot_id: selectedSlot.slot_id,
        category_type: selectedCategory,
        visitor_name: visitorName.trim(),
        visitor_mobile: `+91${visitorMobile}`,
        date_of_birth: null,
        is_senior: isSenior,
        aadhaar_masked: isLocalBooking ? maskAadhaar(aadhaar) : null,
        aadhaar_verification_status: isLocalBooking ? 'pending' : 'not_required',
        residency_verification_status: isLocalBooking ? 'not_required' : 'pending',
        visitor_count: visitorCount,
        total_price: isLocalBooking ? 0 : 500 * visitorCount,
        payment_status: isLocalBooking ? 'not_required' : 'pending',
        booking_status: 'pending',
        admin_remarks: null,
        rejection_reason: null,
        verified_by: null,
        verified_at: null,
        darshan_date: selectedSlot.slot_date,
        created_at: timestamp,
        updated_at: timestamp,
        temple_name: selectedTemple.name,
        district_name: districts.find((district) => district.id === selectedTemple.district_id)?.name,
        slot_date: selectedSlot.slot_date,
        session_type: selectedSlot.session_type,
        slot_start_time: selectedSlot.slot_start_time,
        slot_end_time: selectedSlot.slot_end_time,
      };

      try {
        saveLocalDemoBooking(demoBooking);
      } catch {
        setError('The local demo booking could not be saved in this browser.');
        setSubmitting(false);
        return;
      }
      setBookingResult({ booking_id: bookingId, booking_ref: bookingRef });
      setConfirmedBooking(demoBooking);
      setAadhaarPdf(null);
      if (aadhaarPdfInput.current) aadhaarPdfInput.current.value = '';
      setAadhaar('');
      setAadhaarConsent(false);
      setStep(8);
      setSubmitting(false);
      return;
    }

    try {
      const totalPrice = selectedCategory === 'special' ? 500 * visitorCount : 0;
      const result = await bookSlot({
        temple_id: selectedTemple.id,
        slot_id: selectedSlot.slot_id,
        category_type: selectedCategory,
        visitor_name: visitorName,
        visitor_mobile: visitorMobile,
        date_of_birth: null,
        is_senior: isSenior,
        aadhaar_masked: selectedCategory === 'local' ? maskAadhaar(aadhaar) : null,
        visitor_count: visitorCount,
        total_price: totalPrice,
      });
      if (result.success && result.booking_id && result.booking_ref) {
        setAadhaarPdf(null);
        if (aadhaarPdfInput.current) aadhaarPdfInput.current.value = '';
        setBookingResult({ booking_id: result.booking_id, booking_ref: result.booking_ref });
        if (selectedCategory === 'special') {
          setStep(7); // Payment step
        } else {
          // Load booking details and go to ticket
          await loadBookingDetails(result.booking_id);
          setStep(8);
        }
      } else {
        setError(result.error || 'Booking failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    }
    setSubmitting(false);
  };

  const loadBookingDetails = async (bookingId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        temples(name, districts(name)),
        darshan_slots(slot_date, session_type, slot_start_time, slot_end_time)
      `)
      .eq('id', bookingId)
      .maybeSingle();
    if (data) {
      const temple = (data as unknown as Record<string, unknown>).temples as { name: string; districts: { name: string } | null } | null;
      const slot = (data as unknown as Record<string, unknown>).darshan_slots as { slot_date: string; session_type: string; slot_start_time: string; slot_end_time: string } | null;
      setConfirmedBooking({
        ...(data as unknown as BookingWithDetails),
        temple_name: temple?.name,
        district_name: temple?.districts?.name,
        slot_date: slot?.slot_date,
        session_type: slot?.session_type,
        slot_start_time: slot?.slot_start_time,
        slot_end_time: slot?.slot_end_time,
      } as BookingWithDetails);
    }
  };

  const handleContinueToTicket = async () => {
    if (!bookingResult) return;
    setSubmitting(true);
    await loadBookingDetails(bookingResult.booking_id);
    setStep(8);
    setSubmitting(false);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!selectedDistrict;
      case 2: return !!selectedTemple;
      case 3: return !!selectedCategory;
      case 4: return !!user;
      case 5:
        if (!visitorName.trim() || visitorMobile.length !== 10) return false;
        if (selectedCategory === 'local' && (!aadhaar || aadhaar.replace(/\D/g, '').length !== 12 || !aadhaarConsent || !aadhaarPdf)) return false;
        return true;
      case 6: return !!selectedSlot && !isSlotPast(selectedSlot);
      default: return true;
    }
  };

  const missingLocalDetails = () => {
    const missing: string[] = [];
    if (!visitorName.trim()) missing.push('full name');
    if (visitorMobile.length !== 10) missing.push('10-digit mobile number');
    if (selectedCategory === 'local') {
      if (aadhaar.replace(/\D/g, '').length !== 12) missing.push('12-digit Aadhaar number');
      if (!aadhaarConsent) missing.push('Aadhaar consent');
      if (!aadhaarPdf) missing.push('Aadhaar PDF (up to 5 MB)');
    }
    return missing;
  };

  const nextStep = () => {
    if (step === 4 && !user) {
      setShowLogin(true);
      return;
    }
    if (step < 8 && canProceed()) {
      setError(null);
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative h-[200px] sm:h-[260px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/11539838/pexels-photo-11539838.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Darshan booking"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <span className="text-xs font-semibold text-gold-300 uppercase tracking-[0.2em] mb-2">Book Your Visit</span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white mb-2">Darshan Ticket Booking</h1>
          <p className="text-sm text-cream/80 max-w-xl">Local Darshan and Special Darshan tickets for temples across Tamil Nadu</p>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-6 lg:flex-row">
        {/* Vertical booking steps on desktop; compact horizontal steps on mobile */}
        <aside className="hidden w-56 flex-shrink-0 rounded-xl border border-gold-200 bg-white p-4 shadow-sm lg:block">
          <nav aria-label="Booking progress" className="space-y-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isComplete = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id}>
                  <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                    isCurrent ? 'bg-maroon-deep text-white shadow-md' :
                    isComplete ? 'bg-green-50 text-green-700' :
                    'text-navy-900/40'
                  }`}>
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrent ? 'bg-gold-accent text-maroon-deep' :
                      isComplete ? 'bg-green-600 text-white' :
                      'bg-navy-900/10'
                    }`}>
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`ml-[27px] h-3 w-px ${isComplete ? 'bg-green-300' : 'bg-navy-900/10'}`} />
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="w-full min-w-0 flex-1">
        <div className="mb-8 overflow-x-auto scrollbar-hide lg:hidden">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isComplete = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isCurrent ? 'bg-maroon-deep text-white shadow-md' :
                    isComplete ? 'bg-green-50 text-green-700' :
                    'text-navy-900/40'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent ? 'bg-gold-accent text-maroon-deep' :
                      isComplete ? 'bg-green-600 text-white' :
                      'bg-navy-900/10'
                    }`}>
                      {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-navy-900/20 mx-0.5" />}
                </div>
              );
            })}
          </div>
        </div>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              {error}
              {error.includes('verification') && selectedTemple && (
                <>
                  {' '}
                  <Link to={`/senior-verification?temple=${selectedTemple.id}`} className="font-semibold underline">
                    Apply for senior verification
                  </Link>
                </>
              )}
            </span>
          </div>
        )}

        {/* Step 1: District */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gold-200 p-6">
            <h2 className="font-serif text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gold-600" /> Select Your District
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {districts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDistrict(d.id); }}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedDistrict === d.id
                      ? 'border-maroon-deep bg-maroon-50 shadow-md'
                      : 'border-gold-100 hover:border-gold-accent hover:shadow-sm'
                  }`}
                >
                  <p className="font-semibold text-navy-900 text-sm">{d.name}</p>
                  <p className="text-xs text-navy-900/50 mt-0.5">{d.region} Tamil Nadu</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Temple */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gold-200 p-6">
            <h2 className="font-serif text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Church className="w-5 h-5 text-gold-600" /> Select Temple
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {filteredTemples.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemple(t)}
                  className={`text-left p-4 rounded-lg border-2 transition-all flex gap-3 ${
                    selectedTemple?.id === t.id
                      ? 'border-maroon-deep bg-maroon-50 shadow-md'
                      : 'border-gold-100 hover:border-gold-accent hover:shadow-sm'
                  }`}
                >
                  {t.featured_image && (
                    <img src={t.featured_image} alt={t.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900 text-sm truncate">{t.name}</p>
                    <p className="text-xs text-navy-900/50 mt-0.5">{t.location}</p>
                    <p className="text-xs text-gold-700 mt-0.5">{t.deity}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Category */}
        {step === 3 && selectedTemple && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gold-200 p-6">
              <h2 className="font-serif text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-gold-600" /> Choose Darshan Category
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local Darshan */}
                <button
                  onClick={() => handleSelectCategory('local')}
                  className={`text-left p-5 rounded-xl border-2 transition-all ${
                    selectedCategory === 'local'
                      ? 'border-maroon-deep bg-maroon-50 shadow-lg'
                      : 'border-gold-100 hover:border-maroon-deep/40 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-maroon-deep/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-maroon-deep" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-navy-900">Local Darshan</h3>
                      <p className="text-xs text-navy-900/50">For Tamil Nadu residents</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-navy-900/70">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> 100 tickets per slot</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> 25 reserved for senior citizens</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Aadhaar verification required</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Free of cost</li>
                    <li className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-amber-600" /> Admin approval required</li>
                  </ul>
                </button>

                {/* Special Darshan */}
                <button
                  onClick={() => handleSelectCategory('special')}
                  className={`text-left p-5 rounded-xl border-2 transition-all ${
                    selectedCategory === 'special'
                      ? 'border-navy-900 bg-navy-50 shadow-lg'
                      : 'border-gold-100 hover:border-navy-900/40 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-navy-900/10 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-navy-900" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-navy-900">Special Darshan</h3>
                      <p className="text-xs text-navy-900/50">Priority darshan with payment</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-navy-900/70">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> 50 tickets per slot</li>
                    <li className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-green-600" /> ₹500 per ticket</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> TN residency verification</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Reduced wait time</li>
                    <li className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-amber-600" /> Payment + residency approval</li>
                  </ul>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Login */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-gold-200 p-6">
            <h2 className="font-serif text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gold-600" /> Authentication Required
            </h2>
            {user ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800 text-sm">You are logged in</p>
                  <p className="text-xs text-green-700">User ID: {user.id.slice(0, 8)}...</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Lock className="w-12 h-12 mx-auto text-navy-900/20 mb-3" />
                <p className="text-sm text-navy-900/70 mb-4">
                  Please log in with your mobile number and OTP to continue booking.
                </p>
                <button
                  onClick={() => setShowLogin(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  <Phone className="w-4 h-4" /> Login with OTP
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Visitor Details */}
        {step === 5 && (
          <div className="bg-white rounded-xl shadow-sm border border-gold-200 p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-navy-900 mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-gold-600" /> Visitor Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-navy-900/15 rounded-lg outline-none focus:border-gold-accent transition-colors"
                  placeholder="Enter visitor name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Mobile Number *</label>
                <div className="flex items-center border border-navy-900/15 rounded-lg overflow-hidden focus-within:border-gold-accent">
                  <span className="px-3 py-2.5 text-sm text-navy-900/60 bg-cream border-r border-navy-900/10">+91</span>
                  <input
                    type="tel"
                    value={visitorMobile}
                    onChange={(e) => setVisitorMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 px-3 py-2.5 text-sm outline-none"
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Number of Visitors</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVisitorCount(Math.max(1, visitorCount - 1))}
                    className="w-9 h-9 rounded-lg border border-navy-900/15 text-navy-900 hover:bg-cream transition-colors"
                  >-</button>
                  <span className="w-12 text-center text-sm font-bold text-navy-900">{visitorCount}</span>
                  <button
                    onClick={() => setVisitorCount(Math.min(5, visitorCount + 1))}
                    className="w-9 h-9 rounded-lg border border-navy-900/15 text-navy-900 hover:bg-cream transition-colors"
                  >+</button>
                </div>
                <p className="text-xs text-navy-900/40 mt-1">Maximum 5 visitors per booking</p>
              </div>
            </div>

            {/* Aadhaar verification for Local Darshan */}
            {selectedCategory === 'local' && (
              <div className="bg-cream/50 rounded-lg p-4 border border-gold-200">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-maroon-deep" />
                  <h3 className="font-semibold text-navy-900 text-sm">Aadhaar Verification (Mandatory)</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">Aadhaar Number</label>
                    <input
                      type="text"
                      value={aadhaar}
                      onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      className="w-full px-3 py-2.5 text-sm border border-navy-900/15 rounded-lg outline-none focus:border-gold-accent transition-colors font-mono"
                      placeholder="1234 5678 9012"
                    />
                    <p className="text-xs text-navy-900/40 mt-1">
                      Only the last 4 digits will be stored (e.g., XXXX-XXXX-9012)
                    </p>
                  </div>
                  <div>
                    <label htmlFor="aadhaar-pdf" className="block text-sm font-medium text-navy-900 mb-1.5">
                      Aadhaar Card PDF *
                    </label>
                    <input
                      ref={aadhaarPdfInput}
                      id="aadhaar-pdf"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) => handleAadhaarPdfChange(event.target.files?.[0])}
                      className="w-full text-sm text-navy-900 file:mr-3 file:rounded-lg file:border-0 file:bg-maroon-deep file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-maroon-800"
                    />
                    <p className="text-xs text-navy-900/50 mt-1">
                      PDF only, maximum 5 MB. Demo mode only: the file stays in this browser and is not uploaded or saved.
                    </p>
                    {aadhaarPdf && (
                      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs">
                        <span className="min-w-0 truncate text-navy-900" title={aadhaarPdf.name}>
                          {aadhaarPdf.name} ({(aadhaarPdf.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAadhaarPdfChange(undefined)}
                          className="shrink-0 font-semibold text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aadhaarConsent}
                      onChange={(e) => setAadhaarConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-navy-900/20 text-maroon-deep"
                    />
                    <span className="text-xs text-navy-900/70">
                      I consent to Aadhaar verification as per UIDAI guidelines. I understand my full Aadhaar number will not be stored — only a masked reference and verification status will be retained.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Special Darshan residency note */}
            {selectedCategory === 'special' && (
              <div className="bg-navy-50 rounded-lg p-4 border border-navy-200">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-navy-900" />
                  <h3 className="font-semibold text-navy-900 text-sm">Tamil Nadu Residency Verification</h3>
                </div>
                <p className="text-xs text-navy-900/70">
                  Your Tamil Nadu residency will be verified by the Temple Admin after booking. You will need to provide proof of TN residency during the verification process.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Slot Selection */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gold-200 p-6">
              <h2 className="font-serif text-xl font-bold text-navy-900 mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold-600" /> Select Date & Time Slot
              </h2>
              <p className="text-sm text-navy-900/60 mb-4">
                {selectedTemple?.name} — {selectedCategory === 'local' ? 'Local' : 'Special'} Darshan
                {isSenior && ' (Senior Citizen)'}
              </p>
              {isDemoMode && (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Demo availability for the next 3 dates. These sample slots are not reserved in the live booking system.
                </p>
              )}
              {slotsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-maroon-deep animate-spin" />
                </div>
              ) : (
                <SlotSelection
                  slots={slots}
                  selectedSlotId={selectedSlot?.slot_id || null}
                  onSelect={handleSelectSlot}
                  isSenior={selectedCategory === 'local' && isSenior}
                />
              )}
            </div>
          </div>
        )}

        {/* Step 7: Payment (Special Darshan only) */}
        {step === 7 && (
          <div className="bg-white rounded-xl shadow-sm border border-gold-200 p-6">
            <h2 className="font-serif text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-gold-600" /> Payment
            </h2>
            <div className="bg-navy-50 rounded-lg p-5 mb-4 border border-navy-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-navy-900/70">Temple</span>
                <span className="text-sm font-semibold text-navy-900">{selectedTemple?.name}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-navy-900/70">Date & Slot</span>
                <span className="text-sm font-semibold text-navy-900">
                  {selectedSlot ? formatDate(selectedSlot.slot_date) : ''} • {selectedSlot ? formatTime(selectedSlot.slot_start_time) : ''}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-navy-900/70">Visitors</span>
                <span className="text-sm font-semibold text-navy-900">{visitorCount}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-navy-900/70">Price per ticket</span>
                <span className="text-sm font-semibold text-navy-900">₹500</span>
              </div>
              <div className="border-t border-navy-200 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-navy-900">Total Amount</span>
                <span className="text-2xl font-bold text-navy-900">₹{500 * visitorCount}</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Your slot is reserved as pending. It will be confirmed once online payment is verified and Tamil Nadu residency is approved by the Temple Admin. No payment has been taken yet.
              </p>
            </div>
            <ul className="mb-4 grid gap-2 sm:grid-cols-3 text-xs">
              {[
                { label: 'Online payment gateway', status: 'Pending setup' },
                { label: 'Aadhaar verification', status: 'Pending setup' },
                { label: 'SMS OTP delivery', status: 'Pending setup' },
              ].map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2">
                  <span className="text-navy-900/70">{item.label}</span>
                  <span className="font-semibold text-amber-800">{item.status}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleContinueToTicket}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-navy-900 to-navy-800 text-white text-sm font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
              {submitting ? 'Loading...' : 'View Booking Request'}
            </button>
          </div>
        )}

        {/* Step 8: Ticket */}
        {step === 8 && confirmedBooking && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800 text-sm">
                  {confirmedBooking.booking_status === 'confirmed' ? 'Booking Confirmed!' : 'Booking Submitted!'}
                </p>
                <p className="text-xs text-green-700">
                  {confirmedBooking.booking_status === 'confirmed'
                    ? 'Your ticket is ready. Please carry it to the temple.'
                    : 'Your booking is pending admin verification. You will be notified once approved.'}
                </p>
              </div>
            </div>
            <DigitalTicket booking={confirmedBooking} districtName={confirmedBooking.district_name} />
          </div>
        )}

        {/* Navigation buttons */}
        {step < 8 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-navy-900/60 border border-navy-900/15 rounded-lg hover:bg-cream transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {step === 5 && selectedCategory === 'local' ? (
              <div className="flex flex-col items-end gap-2">
                {!canProceed() && (
                  <p className="max-w-sm text-right text-xs text-amber-800">
                    Please complete: {missingLocalDetails().join(', ')}.
                  </p>
                )}
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-maroon-deep to-maroon-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  Continue to Slot Selection
                </button>
              </div>
            ) : step === 5 && canProceed() && selectedCategory === 'special' ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Ticket className="w-4 h-4" />
                Continue to Slot Selection
              </button>
            ) : step === 6 && canProceed() ? (
              <button
                onClick={handleSubmitBooking}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submitting ? 'Submitting...' : selectedCategory === 'local' ? 'Submit for Verification' : 'Confirm Booking'}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      <OtpLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onAuthenticated={() => {
          setShowLogin(false);
          setStep(5);
        }}
      />
    </PageLayout>
  );
}
