import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Search, Loader2, Church } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { supabase, type District } from '@/lib/supabase';

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'North' | 'Central' | 'South' | 'West'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('districts')
      .select('*')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setDistricts(data as District[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let result = districts;
    if (filter !== 'all') result = result.filter((d) => d.region === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) => d.name.toLowerCase().includes(q) || d.tamil_name.includes(search.trim())
      );
    }
    return result;
  }, [districts, filter, search]);

  const regions: ('all' | 'North' | 'Central' | 'South' | 'West')[] = ['all', 'North', 'Central', 'South', 'West'];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative h-[320px] sm:h-[380px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/33895627/pexels-photo-33895627.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Tamil Nadu temples"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <span className="text-xs font-semibold text-gold-300 uppercase tracking-[0.2em] mb-2">
            38 Districts
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mb-3">
            Explore Tamil Nadu Districts
          </h1>
          <p className="text-sm sm:text-base text-cream/80 max-w-2xl">
            Discover the heritage, temples and cultural identity of all 38 districts of Tamil Nadu.
          </p>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="py-8 px-4 bg-gradient-to-b from-cream to-gold-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-900/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search districts..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-navy-900/10 rounded-lg focus:outline-none focus:border-gold-accent transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => setFilter(r)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    filter === r
                      ? 'bg-maroon-deep text-white shadow-md'
                      : 'bg-white text-navy-900/70 border border-navy-900/10 hover:border-maroon-deep/30'
                  }`}
                >
                  {r === 'all' ? 'All Regions' : r}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-maroon-deep animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20 text-maroon-deep">
              <p className="font-semibold">Unable to load districts</p>
              <p className="text-sm text-navy-900/60 mt-1">{error}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-navy-900/60 mb-4">
                Showing {filtered.length} of {districts.length} districts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((district) => (
                  <Link
                    key={district.id}
                    to={`/districts/${district.id}`}
                    className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 h-64"
                  >
                    <img
                      src={district.image}
                      alt={district.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-900/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gold-200 bg-maroon-deep/50 backdrop-blur-sm px-2 py-0.5 rounded-full mb-2">
                        <MapPin className="w-3 h-3" />
                        {district.region} Tamil Nadu
                      </span>
                      <h3 className="font-serif text-lg font-bold text-white mb-1">{district.name}</h3>
                      {district.tamil_name && (
                        <p className="text-sm text-gold-200 font-tamil mb-1">{district.tamil_name}</p>
                      )}
                      <p className="text-xs text-cream/80 line-clamp-2 mb-3">{district.description}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-300 group-hover:gap-2 transition-all">
                        Explore District
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <Church className="w-12 h-12 mx-auto text-navy-900/20 mb-3" />
                  <p className="text-navy-900/60">No districts found matching your search.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
