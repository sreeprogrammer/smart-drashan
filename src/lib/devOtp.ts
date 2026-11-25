const DEFAULT_TEST_PHONE = '+919876543210';
const DEFAULT_TEST_CODE = '123456';

const DEMO_OTP_TTL_MS = 5 * 60 * 1000;
const pendingDemoOtps = new Map<string, { code: string; expiresAt: number }>();

function normalizeDemoPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return /^\d{10}$/.test(normalized) ? normalized : null;
}

export function isDemoOtpEnabled(): boolean {
  return import.meta.env.DEV;
}

export function generateDemoOtp(phone: string): string | null {
  if (!isDemoOtpEnabled()) return null;
  const normalizedPhone = normalizeDemoPhone(phone);
  if (!normalizedPhone) return null;

  for (const [pendingPhone, pending] of pendingDemoOtps) {
    if (pending.expiresAt < Date.now()) pendingDemoOtps.delete(pendingPhone);
  }
  const activeCodes = new Set([...pendingDemoOtps.values()].map(({ code }) => code));
  const randomValues = new Uint32Array(1);
  let code: string;
  do {
    crypto.getRandomValues(randomValues);
    code = String(100000 + (randomValues[0] % 900000));
  } while (activeCodes.has(code));

  pendingDemoOtps.set(normalizedPhone, {
    code,
    expiresAt: Date.now() + DEMO_OTP_TTL_MS,
  });
  return code;
}

export function verifyDemoOtp(phone: string, otp: string): boolean {
  if (!isDemoOtpEnabled()) return false;
  const normalizedPhone = normalizeDemoPhone(phone);
  if (!normalizedPhone) return false;

  const pending = pendingDemoOtps.get(normalizedPhone);
  if (!pending || pending.expiresAt < Date.now() || pending.code !== otp) return false;

  pendingDemoOtps.delete(normalizedPhone);
  return true;
}

export function getDevelopmentOtpPreview(phone: string): string | null {
  if (!import.meta.env.DEV) return null;

  const testPhone = (import.meta.env.VITE_DEV_OTP_TEST_PHONE || DEFAULT_TEST_PHONE).replace(/\D/g, '');
  const testCode = import.meta.env.VITE_DEV_OTP_TEST_CODE || DEFAULT_TEST_CODE;
  const enteredPhone = phone.replace(/\D/g, '');

  if (!testPhone || !testCode || !/^\d{6}$/.test(testCode) || enteredPhone !== testPhone) {
    return null;
  }

  return testCode;
}
