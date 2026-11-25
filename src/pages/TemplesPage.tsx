import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Search, Loader2, Church, Filter } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { supabase, type Temple, type District } from '@/lib/supabase';

export default function TemplesPage() {
  const [temples, setTemples] = useState<(Temple & { district_name?: string })[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      supabase.from('temples').select('*, districts(name)').order('name'),
      supabase.from('districts').select('id, name').order('name'),
    ]).then(([tRes, dRes]) => {
      if (tRes.error) setError(tRes.error.message);
      else {
        const tData = (tRes.data || []).map((t) => ({
          ...t,
          district_name: (t as Record<string, unknown>).districts
            ? ((t as Record<string, unknown>).districts as Record<string, unknown>).name as string
            : undefined,
        }));
        setTemples(tData as (Temple & { district_name?: string })[]);
      }
      if (dRes.data) setDistricts(dRes.data as District[]);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(temples.map((t) => t.category).filter(Boolean));
    return ['all', ...Array.from(set).sort()] as string[];
  }, [temples]);

  const filtered = useMemo(() => {
    let result = temples;
    if (categoryFilter !== 'all') result = result.filter((t) => t.category === categoryFilter);
    if (districtFilter !== 'all') result = result.filter((t) => t.district_id === districtFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.tamil_name?.includes(search.trim()) ?? false) ||
          (t.deity?.toLowerCase().includes(q) ?? false) ||
          (t.district_name?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [temples, categoryFilter, districtFilter, search]);

  return (
    <PageLayout>
      <section className="relative h-[320px] sm:h-[380px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/5138790/pexels-photo-5138790.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Tamil Nadu temples"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <span className="text-xs font-semibold text-gold-300 uppercase tracking-[0.2em] mb-2">
            114 Sacred Temples
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mb-3">
            Explore Tamil Nadu Temples
          </h1>
          <p className="text-sm sm:text-base text-cream/80 max-w-2xl">
            Browse temples across all 38 districts of Tamil Nadu with detailed information on history, timings, and facilities.
          </p>
        </div>
      </section>

      <section className="py-8 px-4 bg-gradient-to-b from-cream to-gold-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-900/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by temple name, deity, or district..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-navy-900/10 rounded-lg focus:outline-none focus:border-gold-accent transition-colors"
                />
              </div>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="px-4 py-2.5 text-sm bg-white border border-navy-900/10 rounded-lg focus:outline-none focus:border-gold-accent transition-colors cursor-pointer"
              >
                <option value="all">All Districts</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 text-sm bg-white border border-navy-900/10 rounded-lg focus:outline-none focus:border-gold-accent transition-colors cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-maroon-deep animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20 text-maroon-deep">
              <p className="font-semibold">Unable to load temples</p>
              <p className="text-sm text-navy-900/60 mt-1">{error}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-navy-900/60 mb-4">
                Showing {filtered.length} of {temples.length} temples
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((temple) => (
                  <Link
                    key={temple.id}
                    to={`/temples/${temple.id}`}
                    className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-white"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={temple.featured_image || 'https://images.pexels.com/photos/11539838/pexels-photo-11539838.jpeg?auto=compress&cs=tinysrgb&w=800'}
                        alt={temple.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500"
                      />
                      <div className="absolute inset-0 card-overlay" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-maroon-deep/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          <MapPin className="w-3 h-3" />
                          {temple.district_name || temple.location}
                        </span>
                      </div>
                      {temple.verification_status === 'verified' && (
                        <span className="absolute top-2 right-2 text-[10px] font-medium text-green-100 bg-green-600/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif text-base font-bold text-navy-900 group-hover:text-maroon-deep transition-colors mb-1 line-clamp-2">
                        {temple.name}
                      </h3>
                      {temple.tamil_name && (
                        <p className="text-xs text-gold-700 font-tamil mb-1">{temple.tamil_name}</p>
                      )}
                      <p className="text-xs text-navy-900/60 line-clamp-2 mb-3">
                        {temple.description || 'Temple information pending verification.'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gold-700">{temple.category}</span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-maroon-deep group-hover:gap-2 transition-all">
                          Details <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <Church className="w-12 h-12 mx-auto text-navy-900/20 mb-3" />
                  <p className="text-navy-900/60">No temples found matching your search.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
