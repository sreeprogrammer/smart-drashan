import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Ruler, Landmark, User, Phone, Globe,
  Loader2, Church, ArrowRight, Sparkles, Image as ImageIcon, PartyPopper,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { supabase, type District, type Temple } from '@/lib/supabase';

const NA = 'Information not available – Admin update required';
const ARIYALUR_TEMPLE_NAMES = new Set([
  'Gangaikonda Cholapuram Temple',
  'Kaliyuga Varadaraja Perumal Temple Kallankurichi',
  'Siva Temple Melapaluvur',
]);

export default function DistrictDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [district, setDistrict] = useState<District | null>(null);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      supabase.from('districts').select('*').eq('id', id).maybeSingle(),
      supabase.from('temples').select('*').eq('district_id', id).order('name'),
    ]).then(([distRes, templeRes]) => {
      if (distRes.error) setError(distRes.error.message);
      else if (!distRes.data) setError('District not found');
      else {
        const districtData = distRes.data as District;
        setDistrict(districtData);
        const districtTemples = (templeRes.data ?? []) as Temple[];
        setTemples(
          districtData.name === 'Ariyalur'
            ? districtTemples.filter((temple) => ARIYALUR_TEMPLE_NAMES.has(temple.name))
            : districtTemples,
        );
      }
      setLoading(false);
    });
  }, [id]);

  if (loading)
    return (
      <PageLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-maroon-deep animate-spin" />
        </div>
      </PageLayout>
    );

  if (error || !district)
    return (
      <PageLayout>
        <div className="text-center py-20 px-4">
          <Church className="w-16 h-16 mx-auto text-navy-900/20 mb-4" />
          <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">
            {error || 'District not found'}
          </h1>
          <Link
            to="/districts"
            className="inline-flex items-center gap-2 px-6 py-3 bg-maroon-deep text-white font-semibold rounded-lg hover:shadow-xl transition-all mt-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Districts
          </Link>
        </div>
      </PageLayout>
    );

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative h-[400px] sm:h-[480px] overflow-hidden">
        <img
          src={district.image}
          alt={district.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex flex-col justify-end pb-12 px-4">
          <div className="max-w-7xl mx-auto w-full">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-cream/70 mb-4">
              <Link to="/" className="hover:text-gold-300 transition-colors">Home</Link>
              <span>/</span>
              <Link to="/districts" className="hover:text-gold-300 transition-colors">Districts</Link>
              <span>/</span>
              <span className="text-gold-300">{district.name}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-maroon-deep/50 backdrop-blur-sm px-3 py-1 rounded-full">
                <MapPin className="w-3 h-3" />
                {district.region} Tamil Nadu
              </span>
              {district.area_sq_km && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-navy-900/40 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Ruler className="w-3 h-3" />
                  {district.area_sq_km.toLocaleString()} sq km
                </span>
              )}
              {district.formed_year && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-navy-900/40 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  Est. {district.formed_year}
                </span>
              )}
            </div>
            <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white mb-2">
              {district.name}
            </h1>
            {district.tamil_name && (
              <p className="text-xl text-gold-200 font-tamil">{district.tamil_name}</p>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Overview */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-bold text-navy-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gold-600" />
            About {district.name}
          </h2>
          <p className="text-base text-navy-900/80 leading-relaxed">{district.description}</p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: History & Culture */}
          <div className="lg:col-span-2 space-y-8">
            {district.history && (
              <section className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
                <h3 className="font-serif text-xl font-bold text-navy-900 mb-3 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-gold-600" />
                  History
                </h3>
                <p className="text-sm text-navy-900/75 leading-relaxed">{district.history}</p>
              </section>
            )}

            {district.cultural_significance && (
              <section className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
                <h3 className="font-serif text-xl font-bold text-navy-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold-600" />
                  Cultural Significance
                </h3>
                <p className="text-sm text-navy-900/75 leading-relaxed">{district.cultural_significance}</p>
              </section>
            )}

            {(district.tourist_attractions?.length > 0 || district.cultural_heritage?.length > 0) && (
              <section className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
                <h3 className="font-serif text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gold-600" />
                  Heritage & Attractions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {district.tourist_attractions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-maroon-deep mb-2 uppercase tracking-wide">Tourist Attractions</h4>
                      <ul className="space-y-1.5">
                        {district.tourist_attractions.map((a) => (
                          <li key={a} className="text-sm text-navy-900/75 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold-accent mt-1.5 flex-shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {district.cultural_heritage?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-maroon-deep mb-2 uppercase tracking-wide">Cultural Heritage</h4>
                      <ul className="space-y-1.5">
                        {district.cultural_heritage.map((h) => (
                          <li key={h} className="text-sm text-navy-900/75 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold-accent mt-1.5 flex-shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {district.famous_festivals?.length > 0 && (
              <section className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
                <h3 className="font-serif text-xl font-bold text-navy-900 mb-3 flex items-center gap-2">
                  <PartyPopper className="w-5 h-5 text-gold-600" />
                  Famous Festivals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {district.famous_festivals.map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1.5 text-sm font-medium bg-gold-50 text-gold-800 rounded-full border border-gold-200"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Collector + Quick Facts */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
              <h3 className="font-serif text-xl font-bold text-navy-900 mb-4">Quick Facts</h3>
              <dl className="space-y-3">
                <div className="flex justify-between text-sm">
                  <dt className="text-navy-900/60">Region</dt>
                  <dd className="font-medium text-navy-900">{district.region}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-navy-900/60">Area</dt>
                  <dd className="font-medium text-navy-900">
                    {district.area_sq_km ? `${district.area_sq_km.toLocaleString()} sq km` : NA}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-navy-900/60">Formed</dt>
                  <dd className="font-medium text-navy-900">{district.formed_year || NA}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-navy-900/60">Temples Listed</dt>
                  <dd className="font-medium text-navy-900">{temples.length}</dd>
                </div>
                {district.official_website && (
                  <a
                    href={district.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-maroon-deep hover:text-gold-700 transition-colors pt-2"
                  >
                    <Globe className="w-4 h-4" />
                    Official Website
                  </a>
                )}
              </dl>
            </section>

            {/* Collector */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
              <h3 className="font-serif text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gold-600" />
                District Collector
              </h3>
              <div className="flex items-start gap-4">
                {district.collector_image ? (
                  <img
                    src={district.collector_image}
                    alt={district.collector_name || 'Collector'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gold-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-navy-100 to-gold-100 flex items-center justify-center border-2 border-gold-200">
                    <User className="w-8 h-8 text-navy-900/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900 text-sm">
                    {district.collector_name || NA}
                  </p>
                  <p className="text-xs text-navy-900/60 mt-0.5">
                    {district.collector_designation || 'District Collector'}
                  </p>
                  <div className="mt-2 space-y-1">
                    {district.collector_contact && (
                      <p className="flex items-center gap-1.5 text-xs text-navy-900/70">
                        <Phone className="w-3 h-3" />
                        {district.collector_contact}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {!district.collector_name && (
                <p className="text-xs text-navy-900/40 italic mt-3">{NA}</p>
              )}
            </section>
          </div>
        </div>

        {/* Temples in this district */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">
                {temples.length} Temples
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mt-1">
                Temples in {district.name}
              </h2>
            </div>
            <Link
              to="/temples"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-maroon-deep hover:gap-2 transition-all"
            >
              View All Temples
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {temples.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gold-200">
              <Church className="w-12 h-12 mx-auto text-navy-900/20 mb-3" />
              <p className="text-navy-900/60">Temple information is being updated. Please check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {temples.map((temple) => (
                <Link
                  key={temple.id}
                  to={`/temples/${temple.id}`}
                  className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-white"
                >
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={temple.featured_image || 'https://images.pexels.com/photos/11539838/pexels-photo-11539838.jpeg?auto=compress&cs=tinysrgb&w=800'}
                      alt={temple.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500"
                    />
                    <div className="absolute inset-0 card-overlay" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-maroon-deep/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <MapPin className="w-3 h-3" />
                        {temple.location}
                      </span>
                    </div>
                    {temple.verification_status === 'verified' && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-medium text-green-100 bg-green-600/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-lg font-bold text-navy-900 group-hover:text-maroon-deep transition-colors mb-1">
                      {temple.name}
                    </h3>
                    {temple.tamil_name && (
                      <p className="text-sm text-gold-700 font-tamil mb-2">{temple.tamil_name}</p>
                    )}
                    <p className="text-sm text-navy-900/70 line-clamp-2 mb-4">
                      {temple.description || NA}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gold-700">
                        {temple.deity || temple.goddess || 'Deity info pending'}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-semibold text-maroon-deep group-hover:gap-2 transition-all">
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="mt-12">
          <Link
            to="/districts"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-maroon-deep/20 text-maroon-deep font-semibold rounded-lg hover:bg-maroon-deep hover:text-white transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to All Districts
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
