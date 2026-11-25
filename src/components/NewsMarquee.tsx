import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { type NewsArticle, fetchPublishedNews, matchesTimeFilter } from '@/lib/news';

export default function NewsMarquee() {
  const [items, setItems] = useState<NewsArticle[]>([]);

  useEffect(() => {
    fetchPublishedNews()
      .then((rows) => setItems(rows.filter((a) => !matchesTimeFilter(a, 'past'))))
      .catch(() => setItems([]));
  }, []);

  const loop = [...items, ...items];

  return (
    <div className="marquee-container overflow-hidden border-y border-navy-900/10 bg-white/90 py-2.5 text-navy-900 shadow-sm">
      <div className="flex items-center">
        <div className="z-10 flex flex-shrink-0 items-center gap-2 border-r border-navy-900/10 bg-white/95 px-4">
          <Bell className="h-4 w-4 animate-pulse text-gold-600" />
          <span className="whitespace-nowrap text-sm font-semibold text-navy-900">News &amp; Events</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="marquee-content flex gap-12 animate-marquee whitespace-nowrap">
            {loop.map((item, index) => (
              <Link key={`${item.id}-${index}`} to={`/news/${item.id}`} className="text-sm text-navy-800 transition-colors hover:text-maroon-deep">
                {item.headline}
                {item.temple ? ` · ${item.temple.name}` : item.district ? ` · ${item.district.name}` : ''}
              </Link>
            ))}
            {items.length === 0 && (
              <span className="text-sm text-navy-800">Stay tuned for the latest temple news and events.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
