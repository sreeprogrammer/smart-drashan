import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, X, ShieldAlert } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import NewsArticleForm from '@/components/NewsArticleForm';
import { useAuth } from '@/lib/auth';
import {
  type DistrictOption,
  type NewsArticle,
  type NewsCategory,
  type NewsSource,
  fetchAllNewsForAdmin,
  fetchDistrictOptions,
  fetchNewsCategories,
  fetchNewsSources,
  formatNewsDate,
} from '@/lib/news';

type AdminTab = 'all' | 'published' | 'drafts' | 'pending' | 'archived';

const TABS: { value: AdminTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'drafts', label: 'Unpublished' },
  { value: 'pending', label: 'Awaiting verification' },
  { value: 'archived', label: 'Archived' },
];

function matchesTab(article: NewsArticle, tab: AdminTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'published') return article.is_published && !article.is_archived;
  if (tab === 'drafts') return !article.is_published && !article.is_archived;
  if (tab === 'pending') return article.verification_status === 'pending';
  return article.is_archived;
}

function statusBadge(article: NewsArticle) {
  if (article.is_archived) return { label: 'Archived', className: 'bg-navy-900/10 text-navy-900' };
  if (article.is_published) return { label: 'Published', className: 'bg-emerald-100 text-emerald-800' };
  if (article.verification_status === 'rejected') return { label: 'Rejected', className: 'bg-red-100 text-red-800' };
  return { label: 'Draft', className: 'bg-amber-100 text-amber-900' };
}

export default function AdminNewsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('all');
  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, districtRows, categoryRows, sourceRows] = await Promise.all([
        fetchAllNewsForAdmin(),
        fetchDistrictOptions(),
        fetchNewsCategories(),
        fetchNewsSources(),
      ]);
      setArticles(rows);
      setDistricts(districtRows);
      setCategories(categoryRows);
      setSources(sourceRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load news');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, loadAll]);

  const visible = useMemo(() => articles.filter((a) => matchesTab(a, tab)), [articles, tab]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (article: NewsArticle) => {
    setEditing(article);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSaved = () => {
    closeForm();
    loadAll();
  };

  if (authLoading) {
    return <PageLayout><p className="text-center text-navy-900/60 py-24">Checking access...</p></PageLayout>;
  }

  if (!isAdmin) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto text-center py-24 px-4">
          <ShieldAlert className="w-10 h-10 mx-auto text-maroon-deep mb-3" />
          <p className="font-serif text-2xl text-navy-900 mb-2">Administrator access required</p>
          <p className="text-navy-900/60 mb-6">Only authorised temple administrators can manage News &amp; Events.</p>
          <Link to="/admin" className="inline-flex px-5 py-2.5 rounded-lg bg-maroon-deep text-white font-semibold">Go to admin sign in</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">Temple Administration</span>
            <h1 className="font-serif text-3xl font-bold text-navy-900 mt-1">News &amp; Events Manager</h1>
            <p className="text-sm text-navy-900/60 mt-1">Only verified and published items appear on the public website.</p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-maroon-deep text-white font-semibold hover:shadow-lg transition-shadow"
          >
            <Plus className="w-4 h-4" />
            Add news or event
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                tab === t.value
                  ? 'bg-navy-900 text-white border-navy-900'
                  : 'bg-white text-navy-900 border-navy-900/20 hover:border-navy-900'
              }`}
            >
              {t.label} ({articles.filter((a) => matchesTab(a, t.value)).length})
            </button>
          ))}
        </div>

        {loading && <p className="text-navy-900/60 py-12 text-center">Loading...</p>}
        {!loading && error && (
          <div className="text-center py-12">
            <p className="text-navy-900 mb-2">The news list could not be loaded.</p>
            <p className="text-sm text-navy-900/60 mb-4">{error}</p>
            <button type="button" onClick={loadAll} className="px-5 py-2 rounded-lg bg-maroon-deep text-white font-semibold">Try again</button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <p className="text-center text-navy-900/60 py-12 bg-white rounded-xl border border-dashed border-navy-900/20">
            No items in this list yet.
          </p>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="bg-white rounded-xl border border-navy-900/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-navy-900">
                <tr>
                  <th className="px-4 py-3 font-semibold">Headline</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">District and temple</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((article) => {
                  const badge = statusBadge(article);
                  return (
                    <tr key={article.id} className="border-t border-navy-900/10 hover:bg-cream/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-navy-900 line-clamp-2">{article.headline}</p>
                        {article.is_event && <p className="text-xs text-navy-900/60">Event</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-navy-900/80">
                        <p>{article.district?.name ?? 'Information not yet verified'}</p>
                        <p className="text-xs text-navy-900/60">{article.temple?.name ?? 'District-wide'}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-navy-900/80">
                        {formatNewsDate(article.event_start_date ?? article.source_published_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
                        {article.verification_status === 'verified' && (
                          <span className="block text-xs text-navy-900/60 mt-1">Verified</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(article)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-900/20 text-navy-900 hover:border-maroon-deep hover:text-maroon-deep"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-navy-950/60 p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-900/10">
              <h2 className="font-serif text-xl font-bold text-navy-900">{editing ? 'Edit news or event' : 'Add news or event'}</h2>
              <button type="button" onClick={closeForm} className="p-2 rounded-lg hover:bg-cream" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <NewsArticleForm
                key={editing?.id ?? 'new'}
                article={editing}
                districts={districts}
                categories={categories}
                sources={sources}
                onSaved={handleSaved}
                onCancel={closeForm}
              />
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
