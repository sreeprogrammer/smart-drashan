import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Church, MapPin } from 'lucide-react';
import { temples, districts } from '@/data/content';

type Category = 'all' | 'temples' | 'districts';

interface Result {
  type: 'temple' | 'district';
  id: string;
  name: string;
  sub: string;
}

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo<Result[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const templeResults: Result[] =
      (category === 'all' || category === 'temples')
        ? temples
            .filter((t) => t.name.toLowerCase().includes(q) || t.district.toLowerCase().includes(q))
            .map((t) => ({ type: 'temple' as const, id: t.id, name: t.name, sub: t.district }))
        : [];
    const districtResults: Result[] =
      (category === 'all' || category === 'districts')
        ? districts
            .filter((d) => d.name.toLowerCase().includes(q))
            .map((d) => ({ type: 'district' as const, id: d.id, name: d.name, sub: d.region + ' Tamil Nadu' }))
        : [];
    return [...templeResults, ...districtResults].slice(0, 8);
  }, [query, category]);

  const handleResultClick = (result: Result) => {
    setShowResults(false);
    setQuery('');
    if (result.type === 'temple') navigate(`/temples/${result.id}`);
    else navigate(`/districts/${result.id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) handleResultClick(results[0]);
  };

  return (
    <section className="relative z-20 -mt-12 px-4">
      <div ref={containerRef} className="max-w-3xl mx-auto">
        <div className="glass-dark rounded-2xl p-6 sm:p-8 shadow-2xl shadow-navy-900/40 border border-gold-accent/30">
          <div className="text-center mb-5">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2">
              Find Your Divine Destination
            </h2>
            <p className="text-sm sm:text-base text-cream/80">
              Search temples and explore pilgrimage destinations across Tamil Nadu.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-1 relative">
              <div className="flex items-center pl-4 pr-2 text-gold-300">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Search temple or district name..."
                className="w-full pr-10 py-3 bg-white/95 text-navy-900 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-accent placeholder:text-navy-900/40"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setShowResults(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-900/50 hover:text-navy-900"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="px-4 py-3 bg-white/95 text-navy-900 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gold-accent cursor-pointer"
            >
              <option value="all">All</option>
              <option value="temples">Temples</option>
              <option value="districts">Districts</option>
            </select>

            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-gold-300 to-gold-500 text-maroon-deep font-semibold rounded-xl hover:from-gold-400 hover:to-gold-600 transition-all duration-200 shadow-lg shadow-gold-500/20"
            >
              Search
            </button>
          </form>

          {/* Results dropdown */}
          {showResults && query.trim() && (
            <div className="mt-3 bg-white rounded-xl shadow-2xl overflow-hidden border border-gold-accent/20 animate-slide-up">
              {results.length > 0 ? (
                <ul className="max-h-72 overflow-y-auto">
                  {results.map((r) => (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        onClick={() => handleResultClick(r)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cream transition-colors border-b border-gray-100 last:border-0"
                      >
                        {r.type === 'temple' ? (
                          <Church className="w-5 h-5 text-maroon-deep flex-shrink-0" />
                        ) : (
                          <MapPin className="w-5 h-5 text-navy-700 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-900 truncate">{r.name}</p>
                          <p className="text-xs text-navy-900/60">{r.sub}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-gold-700 bg-gold-100 px-2 py-0.5 rounded-full">
                          {r.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-navy-900/60">
                  No results found for "{query}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
