import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarClock, Megaphone, Newspaper } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import NewsCard from '@/components/NewsCard';
import NewsCalendar from '@/components/NewsCalendar';
import {
  type DistrictDetail,
  type NewsArticle,
  type NewsCategory,
  fetchDistrictDetail,
  fetchNewsCategories,
  fetchPublishedNews,
  matchesTimeFilter,
} from '@/lib/news';

interface TempleSummary {
  id: string;
  name: string;
  count: number;
}

export default function DistrictNewsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [district, setDistrict] = useState<DistrictDetail | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchDistrictDetail(id), fetchPublishedNews(), fetchNewsCategories()])
      .then(([detail, news, categoryRows]) => {
        if (cancelled) return;
        setDistrict(detail);
        setArticles(news.filter((a) => a.district_id === id));
        setCategories(categoryRows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this district');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const categoryLabels = useMemo(() => new Map(categories.map((c) => [c.code, c.label_en])), [categories]);

  const upcomingEvents = useMemo(
    () =>
      articles
        .filter((a) => matchesTimeFilter(a, 'upcoming'))
        .sort((a, b) => (a.event_start_date ?? '').localeCompare(b.event_start_date ?? '')),
    [articles],
  );

  const recentAnnouncements = useMemo(
    () =>
      articles
        .filter((a) => !a.is_event)
        .sort((a, b) => (b.source_published_at ?? '').localeCompare(a.source_published_at ?? ''))
        .slice(0, 6),
    [articles],
  );

  const templesWithNews = useMemo<TempleSummary[]>(() => {
    const map = new Map<string, TempleSummary>();
    for (const a of articles) {
      if (!a.temple) continue;
      const entry = map.get(a.temple.id) ?? { id: a.temple.id, name: a.temple.name, count: 0 };
      entry.count += 1;
      map.set(a.temple.id, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [articles]);

  if (loading) {
    return (
      <PageLayout>
        <p className="text-center text-navy-900/60 py-24">Loading district news...</p>
      </PageLayout>
    );
  }

  if (error || !district) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto text-center py-24 px-4">
          <p className="font-serif text-2xl text-navy-900 mb-3">
            {error ? 'This district news could not be loaded.' : 'This district was not found.'}
          </p>
          <Link to="/news" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-maroon-deep text-white font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Back to News &amp; Events
          </Link>
        </div>
      </PageLayout>
    );
  }

  const hasAnything = articles.length > 0;

  return (
    <PageLayout>
      <section className="relative text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 to-maroon-deep" />
        {district.image && (
          <img src={district.image} alt={district.name} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <Link to="/news" className="inline-flex items-center gap-2 text-sm text-cream/80 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" />
            All News &amp; Events
          </Link>
          <span className="block text-xs font-semibold text-gold-300 uppercase tracking-[0.2em] mb-2">District News</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">{district.name}</h1>
          {district.tamil_name && <p className="text-lg text-cream/85 mt-1">{district.tamil_name}</p>}
          {district.description && <p className="text-cream/85 max-w-3xl mt-4 line-clamp-3">{district.description}</p>}

          <div className="grid grid-cols-3 gap-3 max-w-md mt-8">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{articles.filter((a) => !a.is_event).length}</p>
              <p className="text-xs text-cream/75">Verified news</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{upcomingEvents.length}</p>
              <p className="text-xs text-cream/75">Upcoming events</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{templesWithNews.length}</p>
              <p className="text-xs text-cream/75">Temples</p>
            </div>
          </div>
        </div>
      </section>

      {!hasAnything && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-navy-900/20">
            <Newspaper className="w-10 h-10 mx-auto text-gold-600 mb-3" />
            <p className="text-navy-900 font-medium">No verified news or upcoming events available currently.</p>
          </div>
        </section>
      )}

      {hasAnything && (
        <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
          {upcomingEvents.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-navy-900 mb-5">
                <CalendarClock className="w-6 h-6 text-gold-600" /> Upcoming confirmed events
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.slice(0, 6).map((a) => (
                  <NewsCard key={a.id} article={a} categoryLabel={categoryLabels.get(a.category_code) ?? a.category_code} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-serif text-2xl font-bold text-navy-900 mb-5">Festival calendar</h2>
            <NewsCalendar events={articles.filter((a) => a.is_event)} />
          </section>

          {recentAnnouncements.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-navy-900 mb-5">
                <Megaphone className="w-6 h-6 text-gold-600" /> Recent temple announcements
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentAnnouncements.map((a) => (
                  <NewsCard key={a.id} article={a} categoryLabel={categoryLabels.get(a.category_code) ?? a.category_code} />
                ))}
              </div>
            </section>
          )}

          {templesWithNews.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-navy-900 mb-5">
                <Building2 className="w-6 h-6 text-gold-600" /> Temples with news
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {templesWithNews.map((temple) => (
                  <Link
                    key={temple.id}
                    to={`/news?district=${district.id}&temple=${temple.id}`}
                    className="flex items-center justify-between bg-white rounded-lg border border-navy-900/10 px-4 py-3 hover:border-maroon-deep hover:shadow-sm transition-all"
                  >
                    <span className="font-medium text-navy-900">{temple.name}</span>
                    <span className="text-xs font-semibold text-maroon-deep">
                      {temple.count} {temple.count === 1 ? 'item' : 'items'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageLayout>
  );
}
