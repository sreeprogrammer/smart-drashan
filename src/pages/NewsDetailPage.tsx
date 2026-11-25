import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, ExternalLink, MapPin, ShieldCheck, Landmark } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import {
  type NewsArticle,
  eventDateLabel,
  fetchNewsArticle,
  fetchNewsCategories,
  formatNewsDate,
} from '@/lib/news';

const EVENT_STATUS_LABEL = {
  scheduled: 'Scheduled',
  cancelled: 'Cancelled',
  postponed: 'Postponed',
} as const;

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [categoryLabel, setCategoryLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchNewsArticle(id), fetchNewsCategories()])
      .then(([row, categories]) => {
        if (cancelled) return;
        setArticle(row);
        setCategoryLabel(categories.find((c) => c.code === row?.category_code)?.label_en ?? '');
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this article');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageLayout>
        <p className="text-center text-navy-900/60 py-24">Loading article...</p>
      </PageLayout>
    );
  }

  if (error || !article) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto text-center py-24 px-4">
          <p className="font-serif text-2xl text-navy-900 mb-3">
            {error ? 'This article could not be loaded.' : 'This article is not available.'}
          </p>
          <p className="text-navy-900/60 mb-6">It may have been archived or is still awaiting verification.</p>
          <Link to="/news" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-maroon-deep text-white font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Back to News &amp; Events
          </Link>
        </div>
      </PageLayout>
    );
  }

  const isEvent = article.is_event;

  return (
    <PageLayout>
      <article className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        <Link to="/news" className="inline-flex items-center gap-2 text-sm font-medium text-maroon-deep hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to News &amp; Events
        </Link>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {categoryLabel && (
            <span className="text-xs font-semibold bg-maroon-deep text-white px-3 py-1 rounded-full">{categoryLabel}</span>
          )}
          {isEvent && (
            <span className="text-xs font-semibold bg-navy-900 text-white px-3 py-1 rounded-full">
              {EVENT_STATUS_LABEL[article.event_status]}
            </span>
          )}
          {article.is_recurring_annual && (
            <span className="text-xs font-semibold bg-gold-100 text-navy-900 px-3 py-1 rounded-full">Recurring annual festival</span>
          )}
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 leading-tight mb-2">{article.headline}</h1>
        {article.headline_ta && <p className="text-lg text-navy-900/75 mb-6">{article.headline_ta}</p>}

        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-navy-900 to-maroon-deep aspect-[16/9] mb-8 relative">
          {article.image_url ? (
            <img src={article.image_url} alt={article.headline} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-cream/60">
              <Landmark className="w-12 h-12" />
            </div>
          )}
        </div>
        {article.image_url && (
          <p className="text-xs text-navy-900/60 -mt-6 mb-8">
            Image credit: {article.image_credit ?? 'Information not yet verified'}
          </p>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border border-navy-900/10 p-5 mb-8">
          <div className="flex gap-3">
            <Calendar className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" />
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-900/50">{isEvent ? 'Event date' : 'Published'}</dt>
              <dd className="text-navy-900 font-medium">
                {isEvent ? eventDateLabel(article) : formatNewsDate(article.source_published_at)}
              </dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" />
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-900/50">Timings</dt>
              <dd className="text-navy-900 font-medium">{article.event_timings ?? 'Information not yet verified'}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Landmark className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" />
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-900/50">Temple</dt>
              <dd className="font-medium">
                {article.temple ? (
                  <Link to={`/temples/${article.temple.id}`} className="text-maroon-deep hover:underline">
                    {article.temple.name}
                  </Link>
                ) : (
                  <span className="text-navy-900">District-wide notice</span>
                )}
              </dd>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" />
            <div>
              <dt className="text-xs uppercase tracking-wide text-navy-900/50">District and location</dt>
              <dd className="text-navy-900 font-medium">
                {article.district ? (
                  <Link to={`/news?district=${article.district.id}`} className="text-maroon-deep hover:underline">
                    {article.district.name}
                  </Link>
                ) : (
                  'Information not yet verified'
                )}
                {article.location && <span className="block text-sm text-navy-900/70 font-normal">{article.location}</span>}
              </dd>
            </div>
          </div>
        </dl>

        <section className="mb-8">
          <h2 className="font-serif text-xl font-bold text-navy-900 mb-3">Announcement</h2>
          <p className="text-navy-900/80 leading-relaxed whitespace-pre-line">
            {article.description ?? 'Information not yet verified'}
          </p>
          {article.description_ta && (
            <p className="text-navy-900/80 leading-relaxed whitespace-pre-line mt-4">{article.description_ta}</p>
          )}
        </section>

        <section className="bg-cream border border-gold-400/40 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-navy-900/80">
              <p>
                <span className="font-semibold text-navy-900">Source: </span>
                {article.source_organization ?? 'Information not yet verified'}
              </p>
              <p>
                <span className="font-semibold text-navy-900">Last verified: </span>
                {formatNewsDate(article.last_verified_at)}
              </p>
              {article.source_url ? (
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-maroon-deep hover:underline pt-1"
                >
                  View original announcement
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <p>Original link: Information not yet verified</p>
              )}
            </div>
          </div>
        </section>
      </article>
    </PageLayout>
  );
}
