import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Newspaper, CalendarDays, LayoutList, X } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import NewsCard from '@/components/NewsCard';
import NewsCalendar from '@/components/NewsCalendar';
import {
  type DistrictOption,
  type NewsArticle,
  type NewsCategory,
  type NewsTimeFilter,
  articleDateKey,
  fetchDistrictOptions,
  fetchNewsCategories,
  fetchPublishedNews,
  formatNewsDate,
  matchesTimeFilter,
} from '@/lib/news';

const PAGE_SIZE = 9;

const TIME_OPTIONS: { value: NewsTimeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: "Today's events" },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [districtId, setDistrictId] = useState(searchParams.get('district') ?? '');
  const templeId = searchParams.get('temple') ?? '';
  const [categoryCode, setCategoryCode] = useState('');
  const [timeFilter, setTimeFilter] = useState<NewsTimeFilter>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [newsRows, districtRows, categoryRows] = await Promise.all([
        fetchPublishedNews(),
        fetchDistrictOptions(),
        fetchNewsCategories(),
      ]);
      setArticles(newsRows);
      setDistricts(districtRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, districtId, categoryCode, timeFilter, sortOrder]);

  const categoryLabels = useMemo(
    () => new Map(categories.map((c) => [c.code, c.label_en])),
    [categories],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = articles.filter((a) => {
      if (districtId && a.district_id !== districtId) return false;
      if (templeId && a.temple_id !== templeId) return false;
      if (categoryCode && a.category_code !== categoryCode) return false;
      if (!matchesTimeFilter(a, timeFilter)) return false;
      if (!term) return true;
      return [a.headline, a.headline_ta, a.description, a.temple?.name, a.district?.name]
        .some((field) => field?.toLowerCase().includes(term));
    });
    return rows.sort((a, b) => {
      const diff = (articleDateKey(a) ?? '').localeCompare(articleDateKey(b) ?? '');
      return sortOrder === 'newest' ? -diff : diff;
    });
  }, [articles, search, districtId, templeId, categoryCode, timeFilter, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const lastUpdated = articles.reduce<string | null>(
    (latest, a) => (!latest || a.updated_at > latest ? a.updated_at : latest),
    null,
  );

  const templeName = articles.find((a) => a.temple_id === templeId)?.temple?.name ?? 'Selected temple';

  const handleDistrictChange = (value: string) => {
    setDistrictId(value);
    if (value) setSearchParams({ district: value });
    else setSearchParams({});
  };

  return (
    <PageLayout>
      <section className="bg-gradient-to-br from-navy-900 via-navy-900 to-maroon-deep text-white py-12 sm:py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs font-semibold text-gold-300 uppercase tracking-[0.2em]">Verified Information</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mt-2 mb-3">News &amp; Events</h1>
          <p className="text-cream/80 max-w-2xl">
            Festival announcements and temple notices from Tamil Nadu temples. Each item links to its official source.
          </p>
          <p className="text-xs text-cream/60 mt-4">
            {lastUpdated ? `Last updated ${formatNewsDate(lastUpdated)}` : 'No verified news published yet'}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-navy-900/10 shadow-sm p-4 sm:p-5 mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-900/40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by temple, headline or district"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-navy-900/15 bg-cream/40 text-navy-900 placeholder:text-navy-900/40 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          {(districtId || templeId) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {districtId && (
                <Link to={`/news/district/${districtId}`} className="px-3 py-1.5 rounded-full bg-navy-900 text-white font-medium hover:bg-navy-900/90">
                  Open district page
                </Link>
              )}
              {templeId && (
                <button
                  type="button"
                  onClick={() => setSearchParams(districtId ? { district: districtId } : {})}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-100 text-navy-900 font-medium hover:bg-gold-200"
                >
                  {templeName}
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={districtId}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-navy-900/15 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
              aria-label="Filter by district"
            >
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-navy-900/15 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>{c.label_en}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-2.5 rounded-lg border border-navy-900/15 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
              aria-label="Sort news"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-navy-900/20 p-1 bg-cream/40">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${view === 'list' ? 'bg-navy-900 text-white' : 'text-navy-900'}`}
              >
                <LayoutList className="w-4 h-4" /> List
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${view === 'calendar' ? 'bg-navy-900 text-white' : 'text-navy-900'}`}
              >
                <CalendarDays className="w-4 h-4" /> Calendar
              </button>
            </div>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeFilter(option.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  timeFilter === option.value
                    ? 'bg-maroon-deep text-white border-maroon-deep'
                    : 'bg-white text-navy-900 border-navy-900/20 hover:border-maroon-deep hover:text-maroon-deep'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          </div>
        </div>

        {loading && <p className="text-center text-navy-900/60 py-16">Loading verified news...</p>}

        {!loading && error && (
          <div className="text-center py-16">
            <p className="text-navy-900 font-medium mb-2">News could not be loaded right now.</p>
            <p className="text-sm text-navy-900/60 mb-4">{error}</p>
            <button type="button" onClick={loadData} className="px-5 py-2 rounded-lg bg-maroon-deep text-white font-semibold">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-navy-900/20">
            <Newspaper className="w-10 h-10 mx-auto text-gold-600 mb-3" />
            <p className="text-navy-900 font-medium">No verified news or upcoming events available currently.</p>
          </div>
        )}

        {!loading && !error && articles.length > 0 && filtered.length === 0 && (
          <p className="text-center text-navy-900/60 py-16">No news matches these filters.</p>
        )}

        {!loading && !error && view === 'calendar' && (
          <NewsCalendar events={filtered.filter((a) => a.is_event)} />
        )}

        {!loading && !error && view === 'list' && pageItems.length > 0 && (
          <>
            <p className="text-sm text-navy-900/60 mb-4">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{(currentPage - 1) * PAGE_SIZE + pageItems.length} of {filtered.length}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageItems.map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  categoryLabel={categoryLabels.get(article.category_code) ?? article.category_code}
                />
              ))}
            </div>
          </>
        )}

        {view === 'list' && pageCount > 1 && (
          <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-navy-900/20 disabled:opacity-40 hover:border-maroon-deep"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-navy-900 px-3">
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage === pageCount}
              className="p-2 rounded-lg border border-navy-900/20 disabled:opacity-40 hover:border-maroon-deep"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </section>
    </PageLayout>
  );
}
