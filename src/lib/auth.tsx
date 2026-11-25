import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { verifyDemoOtp } from '@/lib/devOtp';
import { saveLocalDemoVisitorProfile, type VisitorProfile } from '@/lib/visitorProfile';
import type { Session, User } from '@supabase/supabase-js';
import type { TempleAdmin } from '@/lib/supabase';

export type { VisitorProfile } from '@/lib/visitorProfile';

export type AdminAccessRole = 'visitor' | 'temple_admin' | 'state_admin' | 'district_admin' | 'temple_staff';

export interface AdminAssignment {
  id: string;
  role: Exclude<AdminAccessRole, 'visitor' | 'temple_admin'>;
  district_id: string | null;
  temple_id: string | null;
  is_active: boolean;
}

type AuthUser = Pick<User, 'id' | 'user_metadata' | 'phone'> & { demoMode?: boolean; demoRole?: AdminAccessRole };

interface VisitorProfileInput {
  fullName: string;
  email: string;
  age: number;
  gender: string;
  districtId: string;
  place: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  accountType: VisitorProfile['account_type'];
  acceptedTerms: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  isDemoMode: boolean;
  loading: boolean;
  adminLoading: boolean;
  isAdmin: boolean;
  adminRole: AdminAccessRole;
  adminAccessError: string | null;
  adminAssignments: AdminAssignment[];
  adminProfile: TempleAdmin | null;
  signInWithOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ error: string | null }>;
  signInWithDemoOtp: (phone: string, otp: string) => Promise<{ error: string | null }>;
  signInWithLocalAdmin: (username: string, password: string, secretCode: string) => Promise<{ error: string | null }>;
  signUp: (input: {
    name: string;
    email: string;
    age: number;
    place: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    phone: string;
    password: string;
  }) => Promise<{ error: string | null; needsPhoneConfirmation: boolean }>;
  createVisitorProfile: (input: VisitorProfileInput) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<AdminAccessRole>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function formatPhoneAuthError(message: string) {
  if (message.toLowerCase().includes('unsupported phone provider')) {
    return 'Phone OTP is not configured for this Supabase project. In Supabase Dashboard, open Authentication → Providers → Phone and enable phone authentication. Configure an SMS provider for real numbers, or add this number under Phone → Test OTPs for local testing.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<TempleAdmin | null>(null);
  const [adminAssignments, setAdminAssignments] = useState<AdminAssignment[]>([]);
  const [adminRole, setAdminRole] = useState<AdminAccessRole>('visitor');
  const [adminAccessError, setAdminAccessError] = useState<string | null>(null);
  const [demoUser, setDemoUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (sess) {
        sessionStorage.removeItem('local-admin-demo-token');
        setDemoUser(null);
      }
      setAdminLoading(!!sess?.user);
      setSession(sess);
      setLoading(false);
    });

    let active = true;
    const localAdminToken = sessionStorage.getItem('local-admin-demo-token');
    if (localAdminToken) {
      fetch('/__local-demo/admin-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localAdminToken}` },
      }).then((response) => {
        if (response.ok && active) {
          setDemoUser({
            id: 'local-admin-demo',
            user_metadata: { full_name: 'Local Demo Admin' },
            demoMode: true,
            demoRole: 'temple_admin',
          });
        } else if (!response.ok) {
          sessionStorage.removeItem('local-admin-demo-token');
        }
      }).catch(() => {
        sessionStorage.removeItem('local-admin-demo-token');
      });
    }

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshAdmin = useCallback(async (): Promise<AdminAccessRole> => {
    setAdminLoading(true);
    const localAdminToken = sessionStorage.getItem('local-admin-demo-token');
    if (localAdminToken) {
      try {
        const response = await fetch('/__local-demo/admin-session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localAdminToken}` },
        });
        if (response.ok) {
          setAdminProfile(null);
          setAdminAssignments([]);
          setAdminRole('temple_admin');
          setAdminAccessError(null);
          setAdminLoading(false);
          return 'temple_admin';
        }
        sessionStorage.removeItem('local-admin-demo-token');
      } catch {
        setAdminLoading(false);
        setAdminAccessError('The local admin demo session could not be checked. Restart the development server and sign in again.');
        return 'visitor';
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const activeUser = sessionData.session?.user;
    if (!activeUser) {
      setAdminProfile(null);
      setAdminAssignments([]);
      setAdminRole('visitor');
      setAdminAccessError(null);
      setAdminLoading(false);
      return 'visitor';
    }
    try {
      const [{ data: legacyData, error: legacyError }, { data: assignmentData, error: assignmentError }] = await Promise.all([
        supabase
          .from('temple_admins')
          .select('*')
          .eq('user_id', activeUser.id)
          .maybeSingle(),
        supabase
          .from('admin_assignments')
          .select('id, role, district_id, temple_id, is_active')
          .eq('user_id', activeUser.id)
          .eq('is_active', true),
      ]);

      if (legacyError || assignmentError) {
        setAdminProfile(null);
        setAdminAssignments([]);
        setAdminRole('visitor');
        setAdminAccessError('Your administrator role could not be verified. Admin access is disabled until verification succeeds.');
        return 'visitor';
      }

      const legacy = legacyData as TempleAdmin | null;
      const assignments = assignmentData as AdminAssignment[];
      setAdminProfile(legacy);
      setAdminAssignments(assignments);
      const role: AdminAccessRole =
        assignments.some((assignment) => assignment.role === 'state_admin') || (legacy?.role === 'super_admin' && legacy.is_active)
          ? 'state_admin'
          : assignments.some((assignment) => assignment.role === 'district_admin')
            ? 'district_admin'
            : assignments.some((assignment) => assignment.role === 'temple_staff')
              ? 'temple_staff'
              : legacy?.is_active
                ? 'temple_admin'
                : 'visitor';
      setAdminRole(role);
      setAdminAccessError(null);
      return role;
    } catch {
      setAdminProfile(null);
      setAdminAssignments([]);
      setAdminRole('visitor');
      setAdminAccessError('Your administrator role could not be verified. Admin access is disabled until verification succeeds.');
      return 'visitor';
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    if (demoUser?.demoRole) {
      setAdminProfile(null);
      setAdminAssignments([]);
      setAdminRole(demoUser.demoRole);
      setAdminAccessError(null);
      setAdminLoading(false);
    } else if (session?.user) {
      refreshAdmin();
    } else {
      setAdminProfile(null);
      setAdminAssignments([]);
      setAdminRole('visitor');
      setAdminAccessError(null);
      setAdminLoading(false);
    }
  }, [session, refreshAdmin, demoUser]);

  const signInWithOtp = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: 'sms' },
      });
      return { error: error ? formatPhoneAuthError(error.message) : null };
    } catch {
      return { error: 'The OTP could not be sent. Check your connection and SMS provider configuration.' };
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });
      return { error: error ? formatPhoneAuthError(error.message) : null };
    } catch {
      return { error: 'OTP verification failed. Check your connection and try again.' };
    }
  };

  const signInWithDemoOtp = async (phone: string, otp: string) => {
    if (!verifyDemoOtp(phone, otp)) {
      return { error: 'The demo OTP is invalid or expired. Request a new code and try again.' };
    }

    setDemoUser({
      id: crypto.randomUUID(),
      user_metadata: { demo_phone: phone, phone },
      phone,
      demoMode: true,
    });
    return { error: null };
  };

  const signInWithLocalAdmin = async (username: string, password: string, secretCode: string) => {
    try {
      const response = await fetch('/__local-demo/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, secretCode }),
      });
      const result = await response.json() as { error?: string; token?: string };
      if (!response.ok || !result.token) {
        return { error: result.error || 'Local admin sign-in failed.' };
      }

      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error) return { error: 'Could not switch from the current account to local demo mode.' };
      }
      sessionStorage.setItem('local-admin-demo-token', result.token);
      setDemoUser({
        id: 'local-admin-demo',
        user_metadata: { full_name: 'Local Demo Admin' },
        demoMode: true,
        demoRole: 'temple_admin',
      });
      setAdminProfile(null);
      setAdminAssignments([]);
      setAdminRole('temple_admin');
      setAdminAccessError(null);
      setAdminLoading(false);
      return { error: null };
    } catch {
      return { error: 'Local admin sign-in is unavailable. Start the project with npm run dev and try again.' };
    }
  };

  const signUp = async (input: {
    name: string;
    email: string;
    age: number;
    place: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    phone: string;
    password: string;
  }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        phone: input.phone,
        password: input.password,
        options: {
          data: {
            full_name: input.name,
            email: input.email,
            age: input.age,
            place: input.place,
            city: input.city,
            state: input.state,
            country: input.country,
            pincode: input.pincode,
          },
        },
      });
      return {
        error: error ? formatPhoneAuthError(error.message) : null,
        needsPhoneConfirmation: !error && !data.session,
      };
    } catch {
      return { error: 'Registration failed. Check your connection and SMS provider configuration.', needsPhoneConfirmation: false };
    }
  };

  const createVisitorProfile = async (input: VisitorProfileInput) => {
    if (demoUser) {
      const phone = String(demoUser.user_metadata?.demo_phone ?? '');
      if (!phone || demoUser.demoRole) {
        return { error: 'Visitor profile registration is unavailable for this demo account.' };
      }

      const address = [input.place, input.city, input.state, input.country, input.pincode].join(', ');
      const profile: VisitorProfile = {
        user_id: demoUser.id,
        full_name: input.fullName,
        email: input.email.trim() || null,
        date_of_birth: null,
        age: input.age,
        gender: input.gender || null,
        state: input.state,
        district_id: input.districtId,
        address,
        place: input.place,
        city: input.city,
        country: input.country,
        pincode: input.pincode,
        phone,
        account_type: input.accountType,
        phone_verified: true,
        accepted_terms_at: new Date().toISOString(),
      };

      try {
        saveLocalDemoVisitorProfile(phone, profile);
        return { error: null };
      } catch {
        return { error: 'Your local visitor profile could not be saved. Check browser storage and try again.' };
      }
    }

    try {
      const { data, error } = await supabase.rpc('create_my_visitor_profile', {
        p_full_name: input.fullName,
        p_email: input.email.trim() || null,
        p_age: input.age,
        p_gender: input.gender || null,
        p_district_id: input.districtId,
        p_address: [input.place, input.city, input.state, input.country, input.pincode].join(', '),
        p_account_type: input.accountType,
        p_accepted_terms: input.acceptedTerms,
        p_place: input.place,
        p_city: input.city,
        p_state: input.state,
        p_country: input.country,
        p_pincode: input.pincode,
      });
      if (error) return { error: error.message };
      const result = data as { success?: boolean; error?: string };
      return { error: result.success ? null : result.error || 'Registration could not be completed.' };
    } catch {
      return { error: 'Your profile could not be saved. Check your connection and database configuration.' };
    }
  };

  const signOut = async () => {
    if (demoUser) {
      sessionStorage.removeItem('local-admin-demo-token');
      setDemoUser(null);
      setAdminProfile(null);
      setAdminAssignments([]);
      setAdminRole('visitor');
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAdminProfile(null);
    setAdminAssignments([]);
    setAdminRole('visitor');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: demoUser || session?.user || null,
        isDemoMode: !!demoUser,
        loading,
        adminLoading,
        isAdmin: adminRole !== 'visitor',
        adminRole,
        adminAccessError,
        adminAssignments,
        adminProfile,
        signInWithOtp,
        verifyOtp,
        signInWithDemoOtp,
        signInWithLocalAdmin,
        signUp,
        createVisitorProfile,
        signOut,
        refreshAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
