import { supabase } from './supabase';

export type SeniorVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface SeniorVerification {
  id: string;
  user_id: string;
  temple_id: string;
  visitor_name: string;
  date_of_birth: string;
  status: SeniorVerificationStatus;
  admin_remarks: string | null;
  reviewed_at: string | null;
  created_at: string;
  temples: { name: string } | null;
}

const VERIFICATION_SELECT =
  'id, user_id, temple_id, visitor_name, date_of_birth, status, admin_remarks, reviewed_at, created_at, temples(name)';

export interface SubmitSeniorVerificationInput {
  user_id: string;
  temple_id: string;
  visitor_name: string;
  date_of_birth: string;
}

export async function submitSeniorVerification(input: SubmitSeniorVerificationInput) {
  const { error } = await supabase
    .from('senior_verifications')
    .insert({ ...input, status: 'pending' });
  if (error) throw error;
}

export async function fetchMySeniorVerifications(userId: string): Promise<SeniorVerification[]> {
  const { data, error } = await supabase
    .from('senior_verifications')
    .select(VERIFICATION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SeniorVerification[];
}

export async function fetchPendingSeniorVerifications(): Promise<SeniorVerification[]> {
  const { data, error } = await supabase
    .from('senior_verifications')
    .select(VERIFICATION_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SeniorVerification[];
}

export async function reviewSeniorVerification(
  verificationId: string,
  decision: 'approved' | 'rejected',
  remarks: string,
) {
  const { data, error } = await supabase.rpc('admin_review_senior_verification', {
    p_verification_id: verificationId,
    p_decision: decision,
    p_remarks: remarks,
  });
  if (error) throw error;
  return data as { success: boolean; status?: string; error?: string };
}
