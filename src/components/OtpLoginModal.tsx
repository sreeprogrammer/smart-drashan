import { useState, useEffect } from 'react';
import { X, Phone, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { generateDemoOtp, isDemoOtpEnabled } from '@/lib/devOtp';

interface OtpLoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
}

export default function OtpLoginModal({ open, onClose, onAuthenticated }: OtpLoginModalProps) {
  const { signInWithOtp, verifyOtp, signInWithDemoOtp, user, isDemoMode, signOut } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setDevelopmentOtp(null);
      if (user) {
        setStep('success');
      } else {
        setStep('phone');
        setOtp('');
      }
    }
  }, [open, user]);

  useEffect(() => {
    if (step === 'success' && user) {
      const timer = setTimeout(() => {
        onAuthenticated?.();
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [step, user, onAuthenticated, onClose]);

  if (!open) return null;

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    return digits;
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    setLoading(true);
    const demoOtp = generateDemoOtp(`+91${phone}`);
    if (demoOtp) {
      setDevelopmentOtp(demoOtp);
      setStep('otp');
      setLoading(false);
      return;
    }
    const { error: err } = await signInWithOtp(`+91${phone}`);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = developmentOtp
      ? await signInWithDemoOtp(`+91${phone}`, otp)
      : await verifyOtp(`+91${phone}`, otp);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setStep('success');
    }
  };

  const handleSignOutAndReset = async () => {
    setError(null);
    const signOutResult = await signOut().then(
      () => null,
      () => 'Sign out failed. Please try again.',
    );
    if (signOutResult) {
      setError(signOutResult);
      return;
    }
    setStep('phone');
    setPhone('');
    setOtp('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy-950/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-maroon-deep to-navy-900 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-cream/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-accent/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-gold-300" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-white">Smart Darshan Login</h2>
              <p className="text-xs text-cream/70">Secure OTP authentication</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Mobile Number</label>
                <div className="flex items-center border border-navy-900/15 rounded-lg overflow-hidden focus-within:border-gold-accent transition-colors">
                  <span className="px-3 py-2.5 text-sm font-medium text-navy-900/60 bg-cream border-r border-navy-900/10">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-2.5 text-sm outline-none"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-navy-900/40 mt-1.5">
                  {isDemoOtpEnabled()
                    ? 'Mini-project demo number: the OTP will appear on this website; no SMS is needed.'
                    : "We'll send a 6-digit OTP by SMS. Enter the code on this website to sign in."}
                </p>
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading || phone.length !== 10}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-navy-900/70">
                  {developmentOtp ? 'Demo OTP for ' : 'OTP sent to '}
                  <span className="font-semibold">+91 {phone}</span>
                </p>
                {developmentOtp && (
                  <p role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    Demo OTP: <span className="font-mono text-lg font-bold tracking-widest">{developmentOtp}</span>
                  </p>
                )}
                <button
                  onClick={() => { setStep('phone'); setError(null); setDevelopmentOtp(null); }}
                  className="text-xs text-maroon-deep hover:underline mt-1"
                >
                  Change number
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 border border-navy-900/15 rounded-lg outline-none focus:border-gold-accent transition-colors"
                  autoFocus
                  maxLength={6}
                />
              </div>
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gold-300 to-gold-500 text-maroon-deep text-sm font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 mx-auto text-green-600 mb-3" />
              <h3 className="font-serif text-lg font-bold text-navy-900 mb-1">
                {isDemoMode ? 'Demo Login Successful!' : 'Login Successful!'}
              </h3>
              <p className="text-sm text-navy-900/60">
                {isDemoMode
                  ? 'This is a local demo session. Supabase data and admin actions are not enabled.'
                  : 'You are now authenticated'}
              </p>
              <button
                onClick={handleSignOutAndReset}
                className="mt-4 text-xs text-maroon-deep hover:underline"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
