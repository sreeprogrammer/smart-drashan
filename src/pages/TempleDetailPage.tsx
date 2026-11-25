import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Loader2, Church, Info, History, Navigation,
  Ticket, ChevronLeft, ChevronRight, X, CheckCircle2, AlertCircle,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import {
  supabase, type Temple, type District, type TempleImage, type TempleInformation,
} from '@/lib/supabase';
import TempleInformationSection from '@/components/TempleInformationSection';
import { TEMPLE_INFORMATION_SECTIONS } from '@/data/templeInformation';

const NA = 'Information not available – Admin update required';

const SECTIONS = [
  { id: 'gallery', label: 'Gallery', icon: Church },
  { id: 'about', label: 'About', icon: Info },
  { id: 'history', label: 'History', icon: History },
  ...TEMPLE_INFORMATION_SECTIONS.map((section) => ({
    id: section.id,
    label: section.title,
    icon: section.icon,
  })),
  { id: 'map', label: 'Map', icon: Navigation },
  { id: 'booking', label: 'Booking', icon: Ticket },
];

interface TempleFullData {
  temple: Temple | null;
  district: District | null;
  images: TempleImage[];
  information: TempleInformation[];
  photoUrls: Record<string, string>;
  photoLoadError: string | null;
  informationLoadError: string | null;
}

export default function TempleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TempleFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('gallery');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const galleryImages = useMemo(() => {
    if (!data?.temple) return [];
    return data.images.length > 0
      ? data.images.map((img) => ({ url: img.image_url, caption: img.caption }))
      : data.temple.featured_image
        ? [{ url: data.temple.featured_image, caption: data.temple.name }]
        : [];
  }, [data]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const { data: temple, error: tErr } = await supabase
        .from('temples').select('*').eq('id', id).maybeSingle();
      if (tErr) { setError(tErr.message); setLoading(false); return; }
      if (!temple) { setError('Temple not found'); setLoading(false); return; }

      const districtId = (temple as Temple).district_id;
      const [districtResult, imageResult, informationResult] = await Promise.all([
        supabase.from('districts').select('*').eq('id', districtId).maybeSingle(),
        supabase.from('temple_images').select('*').eq('temple_id', id).order('display_order'),
        supabase.from('temple_information').select('*').eq('temple_id', id).eq('status', 'verified').order('section'),
      ]);
      if (imageResult.error) {
        setError(`Temple photos could not be loaded: ${imageResult.error.message}`);
        setLoading(false);
        return;
      }

      const information = (informationResult.data ?? []) as TempleInformation[];
      const storagePaths = Array.from(new Set(information.flatMap((record) => {
        const photos = record.details?.photos;
        if (!Array.isArray(photos)) return [];
        return photos.flatMap((photo) => (
          photo && typeof photo === 'object' && typeof photo.storage_path === 'string'
            ? [photo.storage_path]
            : []
        ));
      })));
      const photoUrls: Record<string, string> = {};
      let photoLoadError: string | null = null;
      if (storagePaths.length) {
        const { data: signedPhotos, error: signingError } = await supabase
          .storage.from('temple-info-media').createSignedUrls(storagePaths, 3600);
        if (signingError) {
          photoLoadError = signingError.message;
        } else {
          for (const signedPhoto of signedPhotos ?? []) {
            if (signedPhoto.path && signedPhoto.signedUrl) {
              photoUrls[signedPhoto.path] = signedPhoto.signedUrl;
            } else if (signedPhoto.error) {
              photoLoadError = signedPhoto.error;
            }
          }
        }
      }

      setData({
        temple: temple as Temple,
        district: districtResult.data as District,
        images: (imageResult.data ?? []) as TempleImage[],
        information,
        photoUrls,
        photoLoadError,
        informationLoadError: informationResult.error
          ? `Verified temple information is unavailable until the database migration is applied: ${informationResult.error.message}`
          : null,
      });
      setLoading(false);
    })();
  }, [id]);

  const handleScroll = useCallback(() => {
    const scrollPos = window.scrollY + 140;
    for (const section of SECTIONS) {
      const el = sectionRefs.current[section.id];
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (scrollPos >= top && scrollPos < bottom) {
          setActiveSection(section.id);
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      window.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' });
    }
  };

  // Lightbox navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((p) => (p === null ? p : (p + 1) % galleryImages.length));
      if (e.key === 'ArrowLeft') setLightboxIndex((p) => (p === null ? p : (p - 1 + galleryImages.length) % galleryImages.length));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [galleryImages, lightboxIndex]);

  if (loading)
    return (
      <PageLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-maroon-deep animate-spin" />
        </div>
      </PageLayout>
    );

  if (error || !data || !data.temple)
    return (
      <PageLayout>
        <div className="text-center py-20 px-4">
          <Church className="w-16 h-16 mx-auto text-navy-900/20 mb-4" />
          <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">{error || 'Temple not found'}</h1>
          <Link to="/temples" className="inline-flex items-center gap-2 px-6 py-3 bg-maroon-deep text-white font-semibold rounded-lg hover:shadow-xl transition-all mt-4">
            <ArrowLeft className="w-5 h-5" /> Back to Temples
          </Link>
        </div>
      </PageLayout>
    );

  const { temple, district, information, photoUrls, photoLoadError, informationLoadError } = data;

  const mapUrl = temple.latitude && temple.longitude
    ? `https://www.google.com/maps?q=${temple.latitude},${temple.longitude}&z=15&output=embed`
    : null;
  const directionsUrl = temple.latitude && temple.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${temple.latitude},${temple.longitude}`
    : null;

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative h-[420px] sm:h-[500px] overflow-hidden">
        <img
          src={temple.featured_image || 'https://images.pexels.com/photos/11539838/pexels-photo-11539838.jpeg?auto=compress&cs=tinysrgb&w=1920'}
          alt={temple.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex flex-col justify-end pb-12 px-4">
          <div className="max-w-7xl mx-auto w-full">
            <nav className="flex items-center gap-2 text-xs text-cream/70 mb-4 flex-wrap">
              <Link to="/" className="hover:text-gold-300 transition-colors">Home</Link>
              <span>/</span>
              {district && (
                <>
                  <Link to={`/districts/${district.id}`} className="hover:text-gold-300 transition-colors">{district.name}</Link>
                  <span>/</span>
                </>
              )}
              <span className="text-gold-300">{temple.name}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-maroon-deep/50 backdrop-blur-sm px-3 py-1 rounded-full">
                <MapPin className="w-3 h-3" />
                {temple.location}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-navy-900/40 backdrop-blur-sm px-3 py-1 rounded-full">
                {temple.category}
              </span>
              {temple.verification_status === 'verified' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-100 bg-green-600/70 backdrop-blur-sm px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mb-2">{temple.name}</h1>
            {temple.tamil_name && (
              <p className="text-xl text-gold-200 font-tamil mb-2">{temple.tamil_name}</p>
            )}
            {(temple.deity || temple.goddess) && (
              <p className="text-sm text-cream/80">
                {temple.deity && <>Deity: <span className="font-semibold text-gold-200">{temple.deity}</span></>}
                {temple.deity && temple.goddess && ' • '}
                {temple.goddess && <>Goddess: <span className="font-semibold text-gold-200">{temple.goddess}</span></>}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-8 lg:flex-row">
        {/* Temple section navigation */}
        <aside className="w-full flex-shrink-0 lg:sticky lg:top-24 lg:w-56">
          <nav aria-label="Temple sections" className="hidden flex-col gap-1 rounded-xl border border-gold-200 bg-white p-3 shadow-sm lg:flex">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-maroon-deep text-white shadow-md'
                      : 'text-navy-900/70 hover:bg-gold-50 hover:text-maroon-deep'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>
          <nav aria-label="Temple sections" className="sticky top-16 z-30 flex items-center gap-1 overflow-x-auto border-b border-gold-200 bg-white/95 py-2 shadow-sm backdrop-blur-md scrollbar-hide lg:hidden">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-maroon-deep text-white shadow-md'
                      : 'whitespace-nowrap text-navy-900/70 hover:bg-gold-50 hover:text-maroon-deep'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
        {informationLoadError && (
          <div role="alert" className="mb-8 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {informationLoadError}
          </div>
        )}
        {/* Gallery */}
        <section id="gallery" ref={(el) => { sectionRefs.current.gallery = el; }} className="mb-12 scroll-mt-28">
          <h2 className="font-serif text-2xl font-bold text-navy-900 mb-6 flex items-center gap-2">
            <Church className="w-6 h-6 text-gold-600" /> Temple Gallery
          </h2>
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`relative rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group ${
                    i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.caption || temple.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center border border-gold-200">
              <Church className="w-12 h-12 mx-auto text-navy-900/20 mb-3" />
              <p className="text-navy-900/60 text-sm">Gallery images pending upload. {NA}</p>
            </div>
          )}
        </section>

        {/* About */}
        <section id="about" ref={(el) => { sectionRefs.current.about = el; }} className="mb-12 scroll-mt-28">
          <h2 className="font-serif text-2xl font-bold text-navy-900 mb-4 flex items-center gap-2">
            <Info className="w-6 h-6 text-gold-600" /> About the Temple
          </h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
            <p className="text-sm text-navy-900/80 leading-relaxed mb-4">
              {temple.description || NA}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gold-100">
              {temple.architecture_style && (
                <div>
                  <span className="text-xs font-semibold text-gold-700 uppercase tracking-wide">Architecture</span>
                  <p className="text-sm text-navy-900/75 mt-1">{temple.architecture_style}</p>
                </div>
              )}
              {temple.address && (
                <div>
                  <span className="text-xs font-semibold text-gold-700 uppercase tracking-wide">Address</span>
                  <p className="text-sm text-navy-900/75 mt-1">{temple.address}</p>
                </div>
              )}
              {temple.religious_significance && (
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-gold-700 uppercase tracking-wide">Religious Significance</span>
                  <p className="text-sm text-navy-900/75 mt-1">{temple.religious_significance}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* History */}
        <section id="history" ref={(el) => { sectionRefs.current.history = el; }} className="mb-12 scroll-mt-28">
          <h2 className="font-serif text-2xl font-bold text-navy-900 mb-4 flex items-center gap-2">
            <History className="w-6 h-6 text-gold-600" /> History & Significance
          </h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
            {temple.history || temple.historical_significance ? (
              <div className="space-y-4">
                {temple.history && (
                  <p className="text-sm text-navy-900/80 leading-relaxed">{temple.history}</p>
                )}
                {temple.historical_significance && (
                  <div className="pt-3 border-t border-gold-100">
                    <h4 className="text-sm font-semibold text-maroon-deep mb-2">Historical Significance</h4>
                    <p className="text-sm text-navy-900/75 leading-relaxed">{temple.historical_significance}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-navy-900/50 italic">{NA}</p>
            )}
          </div>
        </section>

        {TEMPLE_INFORMATION_SECTIONS.map((section) => (
          <TempleInformationSection
            key={section.id}
            section={section}
            record={information.find((item) => item.section === section.id)}
            photoUrls={photoUrls}
            photoLoadError={photoLoadError}
            sectionRef={(element) => { sectionRefs.current[section.id] = element; }}
          />
        ))}

        {/* Map */}
        <section id="map" ref={(el) => { sectionRefs.current.map = el; }} className="mb-12 scroll-mt-28">
          <h2 className="font-serif text-2xl font-bold text-navy-900 mb-4 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-gold-600" /> Location & Map
          </h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gold-200">
            {mapUrl ? (
              <>
                <div className="rounded-lg overflow-hidden mb-4">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    loading="lazy"
                    title={`Map of ${temple.name}`}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  {directionsUrl && (
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-maroon-deep text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all">
                      <Navigation className="w-4 h-4" /> Get Directions
                    </a>
                  )}
                  <span className="inline-flex items-center gap-2 text-sm text-navy-900/60">
                    <MapPin className="w-4 h-4 text-gold-600" />
                    {temple.latitude?.toFixed(4)}, {temple.longitude?.toFixed(4)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-navy-900/50 italic">{NA}</p>
            )}
          </div>
        </section>

        {/* Booking */}
        <section id="booking" ref={(el) => { sectionRefs.current.booking = el; }} className="mb-12 scroll-mt-28">
          <h2 className="font-serif text-2xl font-bold text-navy-900 mb-4 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-gold-600" /> Darshan Booking
          </h2>
          <div className="bg-gradient-to-br from-maroon-deep to-navy-900 rounded-xl p-8 text-center text-white">
            <Ticket className="w-12 h-12 mx-auto text-gold-300 mb-4" />
            <h3 className="font-serif text-xl font-bold mb-2">Book Your Darshan Slot</h3>
            <p className="text-sm text-cream/80 max-w-md mx-auto mb-6">
              Reserve your special darshan slot online to avoid waiting in queues. Smart Darshan offers real-time slot availability and crowd intelligence.
            </p>
            <Link
              to={`/tickets?temple=${temple.id}`}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-gold-300 to-gold-500 text-maroon-deep font-bold rounded-lg hover:from-gold-400 hover:to-gold-600 hover:shadow-xl transition-all"
            >
              <Ticket className="w-5 h-5" /> Book Now
            </Link>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-4">
          {district && (
            <Link to={`/districts/${district.id}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-maroon-deep/20 text-maroon-deep font-semibold rounded-lg hover:bg-maroon-deep hover:text-white transition-all duration-300">
              <ArrowLeft className="w-5 h-5" /> Back to {district.name}
            </Link>
          )}
          <Link to="/temples" className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-navy-900/20 text-navy-900 font-semibold rounded-lg hover:bg-navy-900 hover:text-white transition-all duration-300">
            <ArrowLeft className="w-5 h-5" /> All Temples
          </Link>
        </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && galleryImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-navy-950/95 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors" onClick={() => setLightboxIndex(null)}>
            <X className="w-8 h-8" />
          </button>
          <button
            className="absolute left-4 text-white/70 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => (p === null ? p : (p - 1 + galleryImages.length) % galleryImages.length)); }}
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <img
            src={galleryImages[lightboxIndex].url}
            alt={galleryImages[lightboxIndex].caption || temple.name}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white/70 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => (p === null ? p : (p + 1) % galleryImages.length)); }}
          >
            <ChevronRight className="w-10 h-10" />
          </button>
          {galleryImages[lightboxIndex].caption && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-cream/80">
              {galleryImages[lightboxIndex].caption}
            </p>
          )}
        </div>
      )}
    </PageLayout>
  );
}
