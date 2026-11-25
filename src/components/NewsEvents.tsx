import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Newspaper } from 'lucide-react';
import {
  type NewsArticle,
  eventDateLabel,
  fetchPublishedNews,
  formatNewsDate,
  matchesTimeFilter,
} from '@/lib/news';

export default function NewsEvents() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublishedNews()
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const displayItems = useMemo(() => {
    const current = articles.filter((a) => !matchesTimeFilter(a, 'past'));
    return [...current]
      .sort((a, b) => {
        const dateA = a.event_start_date ?? a.source_published_at ?? a.created_at;
        const dateB = b.event_start_date ?? b.source_published_at ?? b.created_at;
        return dateB.localeCompare(dateA);
      })
      .slice(0, 3);
  }, [articles]);

  const hasContent = displayItems.length > 0;

  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">Stay Updated</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2 mb-3">Latest News &amp; Events</h2>
          <p className="text-base text-navy-900/70 max-w-2xl mx-auto">
            Verified festival announcements and notices from Tamil Nadu temples, linked to their official sources.
          </p>
        </div>

        {loading && <p className="text-center text-navy-900/60 py-12">Loading verified news...</p>}

        {!loading && !hasContent && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-navy-900/20">
            <Newspaper className="w-10 h-10 mx-auto text-gold-600 mb-3" />
            <p className="text-navy-900 font-medium">No verified news or upcoming events available currently.</p>
          </div>
        )}

        {!loading && hasContent && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayItems.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                className="group relative min-h-[320px] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-gradient-to-br from-navy-900 to-maroon-deep"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.headline}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-900/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <span className="inline-block text-xs font-semibold text-gold-300 bg-maroon-deep/60 px-3 py-1 rounded-full mb-3">
                    {item.is_event ? 'Upcoming Event' : 'Latest News'}
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight">
                    {item.headline}
                  </h3>
                  <div className="flex items-center gap-2 text-gold-200 text-sm mb-3">
                    <Calendar className="w-4 h-4" />
                    {item.is_event ? eventDateLabel(item) : formatNewsDate(item.source_published_at)}
                    {item.temple ? ` · ${item.temple.name}` : ''}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-300 group-hover:gap-2 transition-all">
                    Read More
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 px-8 py-3 bg-maroon-deep text-white font-semibold rounded-lg hover:shadow-xl transition-shadow duration-300"
          >
            View All News &amp; Events
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
