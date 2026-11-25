import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  type DistrictOption,
  type NewsArticle,
  type NewsAuditEntry,
  type NewsCategory,
  type NewsEventStatus,
  type NewsPayload,
  type NewsSource,
  type NewsVerificationStatus,
  type TempleOption,
  fetchNewsAuditLog,
  fetchTempleOptions,
  formatNewsDate,
  saveNewsArticle,
} from '@/lib/news';

interface NewsArticleFormProps {
  article: NewsArticle | null;
  districts: DistrictOption[];
  categories: NewsCategory[];
  sources: NewsSource[];
  onSaved: () => void;
  onCancel: () => void;
}

interface FormState {
  district_id: string;
  temple_id: string;
  source_id: string;
  category_code: string;
  headline: string;
  headline_ta: string;
  description: string;
  description_ta: string;
  location: string;
  is_event: boolean;
  event_start_date: string;
  event_end_date: string;
  event_timings: string;
  event_status: NewsEventStatus;
  is_recurring_annual: boolean;
  source_published_at: string;
  source_organization: string;
  source_url: string;
  image_url: string;
  image_credit: string;
  verification_status: NewsVerificationStatus;
  is_published: boolean;
  is_archived: boolean;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-navy-900/15 bg-white text-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400';

function initialState(article: NewsArticle | null, categories: NewsCategory[]): FormState {
  return {
    district_id: article?.district_id ?? '',
    temple_id: article?.temple_id ?? '',
    source_id: article?.source_id ?? '',
    category_code: article?.category_code ?? categories[0]?.code ?? '',
    headline: article?.headline ?? '',
    headline_ta: article?.headline_ta ?? '',
    description: article?.description ?? '',
    description_ta: article?.description_ta ?? '',
    location: article?.location ?? '',
    is_event: article?.is_event ?? false,
    event_start_date: article?.event_start_date ?? '',
    event_end_date: article?.event_end_date ?? '',
    event_timings: article?.event_timings ?? '',
    event_status: article?.event_status ?? 'scheduled',
    is_recurring_annual: article?.is_recurring_annual ?? false,
    source_published_at: article?.source_published_at ?? '',
    source_organization: article?.source_organization ?? '',
    source_url: article?.source_url ?? '',
    image_url: article?.image_url ?? '',
    image_credit: article?.image_credit ?? '',
    verification_status: article?.verification_status ?? 'pending',
    is_published: article?.is_published ?? false,
    is_archived: article?.is_archived ?? false,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function validate(form: FormState): string | null {
  if (!form.headline.trim()) return 'Headline is required.';
  if (!form.district_id) return 'Select a district.';
  if (!form.category_code) return 'Select a category.';
  if (form.is_event && !form.event_start_date) return 'Events need a start date.';
  if (form.event_start_date && form.event_end_date && form.event_end_date < form.event_start_date) {
    return 'The end date cannot be before the start date.';
  }
  if (form.image_url && !form.image_url.startsWith('https://')) return 'Image links must start with https://.';
  if (form.source_url && !/^https?:\/\//i.test(form.source_url)) return 'Source link must start with http:// or https://.';
  if (form.verification_status === 'verified') {
    if (!form.source_url.trim()) return 'Verified items need the official source link.';
    if (!form.source_organization.trim()) return 'Verified items need the source organisation.';
  }
  if (form.is_published && form.verification_status !== 'verified') {
    return 'Only verified items can be published.';
  }
  return null;
}

function toPayload(form: FormState): NewsPayload {
  return {
    district_id: form.district_id,
    temple_id: nullable(form.temple_id),
    source_id: nullable(form.source_id),
    category_code: form.category_code,
    headline: form.headline.trim(),
    headline_ta: nullable(form.headline_ta),
    description: nullable(form.description),
    description_ta: nullable(form.description_ta),
    location: nullable(form.location),
    is_event: form.is_event,
    event_start_date: form.is_event ? nullable(form.event_start_date) : null,
    event_end_date: form.is_event ? nullable(form.event_end_date) : null,
    event_timings: form.is_event ? nullable(form.event_timings) : null,
    event_status: form.is_event ? form.event_status : 'scheduled',
    is_recurring_annual: form.is_event ? form.is_recurring_annual : false,
    source_published_at: nullable(form.source_published_at),
    source_organization: nullable(form.source_organization),
    source_url: nullable(form.source_url),
    image_url: nullable(form.image_url),
    image_credit: nullable(form.image_credit),
    verification_status: form.verification_status,
    is_published: form.is_published,
    is_archived: form.is_archived,
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-navy-900/70 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-navy-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-maroon-deep"
      />
      {label}
    </label>
  );
}

export default function NewsArticleForm({ article, districts, categories, sources, onSaved, onCancel }: NewsArticleFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(article, categories));
  const [temples, setTemples] = useState<TempleOption[]>([]);
  const [auditLog, setAuditLog] = useState<NewsAuditEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!form.district_id) {
      setTemples([]);
      return;
    }
    let cancelled = false;
    fetchTempleOptions(form.district_id)
      .then((rows) => {
        if (!cancelled) setTemples(rows);
      })
      .catch(() => {
        if (!cancelled) setTemples([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.district_id]);

  useEffect(() => {
    if (!article) return;
    fetchNewsAuditLog(article.id)
      .then(setAuditLog)
      .catch(() => setAuditLog([]));
  }, [article]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveNewsArticle(article?.id ?? null, toPayload(form));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this article.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-navy-900">Place and category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="District">
            <select
              value={form.district_id}
              onChange={(e) => setForm((prev) => ({ ...prev, district_id: e.target.value, temple_id: '' }))}
              className={inputClass}
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Temple (optional)">
            <select
              value={form.temple_id}
              onChange={(e) => set('temple_id', e.target.value)}
              className={inputClass}
              disabled={!form.district_id}
            >
              <option value="">District-wide notice</option>
              {temples.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select value={form.category_code} onChange={(e) => set('category_code', e.target.value)} className={inputClass}>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>{c.label_en}</option>
              ))}
            </select>
          </Field>
          <Field label="Location (optional)">
            <input value={form.location} onChange={(e) => set('location', e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-navy-900">Announcement</h3>
        <Field label="Headline (English)">
          <input value={form.headline} onChange={(e) => set('headline', e.target.value)} className={inputClass} maxLength={250} />
        </Field>
        <Field label="Headline (Tamil, only if verified)">
          <input value={form.headline_ta} onChange={(e) => set('headline_ta', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Description, copied from the official announcement">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className={inputClass} />
        </Field>
        <Field label="Description (Tamil, only if verified)">
          <textarea value={form.description_ta} onChange={(e) => set('description_ta', e.target.value)} rows={3} className={inputClass} />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-navy-900">Event details</h3>
        <Toggle label="This is a festival or event" checked={form.is_event} onChange={(v) => set('is_event', v)} />
        {form.is_event && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start date">
              <input type="date" value={form.event_start_date} onChange={(e) => set('event_start_date', e.target.value)} className={inputClass} />
            </Field>
            <Field label="End date">
              <input type="date" value={form.event_end_date} onChange={(e) => set('event_end_date', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Timings, if officially announced">
              <input value={form.event_timings} onChange={(e) => set('event_timings', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Event status">
              <select value={form.event_status} onChange={(e) => set('event_status', e.target.value as NewsEventStatus)} className={inputClass}>
                <option value="scheduled">Scheduled</option>
                <option value="postponed">Postponed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Toggle
                label="Recurring annual festival (dates must be confirmed for each year)"
                checked={form.is_recurring_annual}
                onChange={(v) => set('is_recurring_annual', v)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-navy-900">Official source and image</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Source (from the official list)">
            <select value={form.source_id} onChange={(e) => set('source_id', e.target.value)} className={inputClass}>
              <option value="">Not from the listed sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Source organisation">
            <input value={form.source_organization} onChange={(e) => set('source_organization', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Original announcement link">
            <input type="url" value={form.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder="https://" className={inputClass} />
          </Field>
          <Field label="Published on (source date)">
            <input type="date" value={form.source_published_at} onChange={(e) => set('source_published_at', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Authorised image link (https only, optional)">
            <input type="url" value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://" className={inputClass} />
          </Field>
          <Field label="Image credit">
            <input value={form.image_credit} onChange={(e) => set('image_credit', e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 bg-cream/60 rounded-xl p-4 border border-gold-400/30">
        <h3 className="font-serif text-lg font-bold text-navy-900">Verification and publishing</h3>
        <Field label="Verification status">
          <select value={form.verification_status} onChange={(e) => set('verification_status', e.target.value as NewsVerificationStatus)} className={inputClass}>
            <option value="pending">Pending verification</option>
            <option value="verified">Verified against the official source</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
        <div className="flex flex-wrap gap-6">
          <Toggle label="Published on the website" checked={form.is_published} onChange={(v) => set('is_published', v)} />
          <Toggle label="Archived (hidden from visitors)" checked={form.is_archived} onChange={(v) => set('is_archived', v)} />
        </div>
      </section>

      {article && (
        <section className="space-y-2">
          <h3 className="font-serif text-lg font-bold text-navy-900">Change history</h3>
          {auditLog.length === 0 ? (
            <p className="text-sm text-navy-900/60">No changes recorded yet.</p>
          ) : (
            <ul className="text-sm text-navy-900/80 space-y-1">
              {auditLog.map((entry) => (
                <li key={entry.created_at}>
                  {entry.action === 'created' ? 'Created' : 'Updated'} on {formatNewsDate(entry.created_at)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-3 pt-2 border-t border-navy-900/10">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-navy-900/20 text-navy-900 font-medium hover:border-maroon-deep">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-maroon-deep text-white font-semibold disabled:opacity-60">
          {saving ? 'Saving...' : article ? 'Save changes' : 'Create article'}
        </button>
      </div>
    </form>
  );
}
