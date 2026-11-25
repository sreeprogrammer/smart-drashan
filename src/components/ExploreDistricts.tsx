import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { districts } from '@/data/content';

export default function ExploreDistricts() {
  const [filter, setFilter] = useState<'all' | 'North' | 'Central' | 'South' | 'West'>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? districts : districts.filter((d) => d.region === filter)),
    [filter]
  );

  const regions: ('all' | 'North' | 'Central' | 'South' | 'West')[] = ['all', 'North', 'Central', 'South', 'West'];

  return (
    <section className="py-16 sm:py-20 px-4 bg-gradient-to-b from-cream to-gold-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">
            38 Districts
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2 mb-3">
            Explore Tamil Nadu Districts
          </h2>
          <p className="text-base text-navy-900/70 max-w-2xl mx-auto">
            Discover the heritage, temples and cultural identity of all 38 districts of Tamil Nadu.
          </p>
        </div>

        {/* Region filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
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
                <p className="text-xs text-cream/80 line-clamp-2 mb-3">{district.description}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-300 group-hover:gap-2 transition-all">
                  Explore District
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/districts"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-navy-800 to-navy-900 text-white font-semibold rounded-lg hover:shadow-xl transition-all duration-300"
          >
            <Search className="w-5 h-5" />
            Explore All 38 Districts
          </Link>
        </div>
      </div>
    </section>
  );
}
