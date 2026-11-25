import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Landmark, Ban, Clock } from 'lucide-react';
import { type NewsArticle, eventDateLabel, formatNewsDate } from '@/lib/news';

interface NewsCardProps {
  article: NewsArticle;
  categoryLabel: string;
}

export default function NewsCard({ article, categoryLabel }: NewsCardProps) {
  const isEvent = article.is_event;
  const dateLine = isEvent ? eventDateLabel(article) : formatNewsDate(article.source_published_at);

  return (
    <Link
      to={`/news/${article.id}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-navy-900/10 shadow-sm hover:shadow-lg transition-shadow duration-300"
    >
      <div className="relative aspect-[16/9] bg-gradient-to-br from-navy-900 to-maroon-deep overflow-hidden">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.headline}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-cream/60">
            <Landmark className="w-10 h-10" />
          </div>
        )}
        <span className="absolute top-3 left-3 text-xs font-semibold bg-white/95 text-maroon-deep px-2.5 py-1 rounded-full">
          {categoryLabel}
        </span>
        {article.event_status !== 'scheduled' && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold bg-red-700 text-white px-2.5 py-1 rounded-full">
            <Ban className="w-3 h-3" />
            {article.event_status === 'cancelled' ? 'Cancelled' : 'Postponed'}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-900/60 mb-2">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {dateLine}
          </span>
          {isEvent && article.event_timings && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {article.event_timings}
            </span>
          )}
        </div>

        <h3 className="font-serif text-lg font-bold text-navy-900 leading-snug mb-1 group-hover:text-maroon-deep transition-colors line-clamp-2">
          {article.headline}
        </h3>
        {article.headline_ta && (
          <p className="text-sm text-navy-900/70 mb-2 line-clamp-1">{article.headline_ta}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 text-xs font-medium text-maroon-deep mb-3">
          {article.temple && <span>{article.temple.name}</span>}
          {article.district && (
            <span className="inline-flex items-center gap-1 text-navy-900/60">
              <MapPin className="w-3.5 h-3.5" />
              {article.district.name}
            </span>
          )}
        </div>

        <p className="text-sm text-navy-900/70 line-clamp-3 mb-4">
          {article.description ?? 'Information not yet verified'}
        </p>

        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-maroon-deep group-hover:gap-2.5 transition-all">
          Read More
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}
