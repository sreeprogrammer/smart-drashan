import { supabase } from '@/lib/supabase';

export type NewsVerificationStatus = 'pending' | 'verified' | 'rejected';
export type NewsEventStatus = 'scheduled' | 'cancelled' | 'postponed';
export type NewsTimeFilter = 'all' | 'today' | 'upcoming' | 'past';

export interface NewsArticle {
  id: string;
  district_id: string;
  temple_id: string | null;
  source_id: string | null;
  category_code: string;
  headline: string;
  headline_ta: string | null;
  description: string | null;
  description_ta: string | null;
  location: string | null;
  is_event: boolean;
  event_start_date: string | null;
  event_end_date: string | null;
  event_timings: string | null;
  event_status: NewsEventStatus;
  is_recurring_annual: boolean;
  source_published_at: string | null;
  source_organization: string | null;
  source_url: string | null;
  image_url: string | null;
  image_credit: string | null;
  verification_status: NewsVerificationStatus;
  last_verified_at: string | null;
  is_published: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  district: { id: string; name: string } | null;
  temple: { id: string; name: string } | null;
}

export interface NewsCategory {
  code: string;
  label_en: string;
  sort_order: number;
}

export interface NewsSource {
  id: string;
  name: string;
  organization: string;
  url: string;
  last_synced_at: string | null;
  last_sync_status: string;
}

export interface DistrictOption {
  id: string;
  name: string;
}

export interface TempleOption {
  id: string;
  name: string;
}

export interface NewsAuditEntry {
  action: 'created' | 'updated';
  details: Record<string, unknown>;
  created_at: string;
}

export interface NewsPayload {
  district_id: string;
  temple_id: string | null;
  source_id: string | null;
  category_code: string;
  headline: string;
  headline_ta: string | null;
  description: string | null;
  description_ta: string | null;
  location: string | null;
  is_event: boolean;
  event_start_date: string | null;
  event_end_date: string | null;
  event_timings: string | null;
  event_status: NewsEventStatus;
  is_recurring_annual: boolean;
  source_published_at: string | null;
  source_organization: string | null;
  source_url: string | null;
  image_url: string | null;
  image_credit: string | null;
  verification_status: NewsVerificationStatus;
  is_published: boolean;
  is_archived: boolean;
}

const ARTICLE_SELECT = '*, district:districts(id, name), temple:temples(id, name)';

export async function fetchPublishedNews(): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from('news_articles')
    .select(ARTICLE_SELECT)
    .eq('is_published', true)
    .eq('is_archived', false)
    .eq('verification_status', 'verified')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as NewsArticle[];
}

export async function fetchAllNewsForAdmin(): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from('news_articles')
    .select(ARTICLE_SELECT)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as NewsArticle[];
}

export async function fetchNewsArticle(id: string): Promise<NewsArticle | null> {
  const { data, error } = await supabase
    .from('news_articles')
    .select(ARTICLE_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as NewsArticle | null) ?? null;
}

export async function fetchNewsCategories(): Promise<NewsCategory[]> {
  const { data, error } = await supabase
    .from('news_categories')
    .select('code, label_en, sort_order')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as NewsCategory[];
}

export async function fetchNewsSources(): Promise<NewsSource[]> {
  const { data, error } = await supabase
    .from('news_sources')
    .select('id, name, organization, url, last_synced_at, last_sync_status')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as NewsSource[];
}

export interface DistrictDetail {
  id: string;
  name: string;
  tamil_name: string | null;
  description: string | null;
  image: string | null;
}

export async function fetchDistrictDetail(id: string): Promise<DistrictDetail | null> {
  const { data, error } = await supabase
    .from('districts')
    .select('id, name, tamil_name, description, image')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DistrictDetail | null) ?? null;
}

export async function fetchDistrictOptions(): Promise<DistrictOption[]> {
  const { data, error } = await supabase.from('districts').select('id, name').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as DistrictOption[];
}

export async function fetchTempleOptions(districtId: string): Promise<TempleOption[]> {
  const { data, error } = await supabase
    .from('temples')
    .select('id, name')
    .eq('district_id', districtId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as TempleOption[];
}

export async function fetchNewsAuditLog(articleId: string): Promise<NewsAuditEntry[]> {
  const { data, error } = await supabase
    .from('news_audit_logs')
    .select('action, details, created_at')
    .eq('article_id', articleId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as NewsAuditEntry[];
}

export async function saveNewsArticle(id: string | null, payload: NewsPayload): Promise<string> {
  const { data, error } = await supabase.rpc('admin_save_news_article', {
    p_id: id,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('Save did not return an article ID');
  return data;
}

export function formatIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(): string {
  return formatIsoDate(new Date());
}

export function articleDateKey(article: NewsArticle): string | null {
  return article.event_start_date ?? article.source_published_at;
}

export function articleEndKey(article: NewsArticle): string | null {
  return article.event_end_date ?? article.event_start_date ?? article.source_published_at;
}

export function matchesTimeFilter(article: NewsArticle, filter: NewsTimeFilter): boolean {
  if (filter === 'all') return true;
  const start = articleDateKey(article);
  const end = articleEndKey(article);
  if (!start || !end) return false;
  const today = todayIso();
  if (filter === 'today') return start <= today && end >= today;
  if (filter === 'upcoming') return article.is_event && start >= today;
  return end < today;
}

export function formatNewsDate(value: string | null | undefined): string {
  if (!value) return 'Information not yet verified';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function eventDateLabel(article: NewsArticle): string {
  if (!article.event_start_date) return 'Information not yet verified';
  const start = formatNewsDate(article.event_start_date);
  if (!article.event_end_date || article.event_end_date === article.event_start_date) return start;
  return `${start} to ${formatNewsDate(article.event_end_date)}`;
}
