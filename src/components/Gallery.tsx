import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ArrowRight, ZoomIn } from 'lucide-react';
import { galleryImages } from '@/data/content';

interface GalleryProps {
  showFullGalleryLink?: boolean;
}

export default function Gallery({ showFullGalleryLink = true }: GalleryProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const prev = useCallback(() => setLightbox((i) => (i === null ? null : (i - 1 + galleryImages.length) % galleryImages.length)), []);
  const next = useCallback(() => setLightbox((i) => (i === null ? null : (i + 1) % galleryImages.length)), []);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [lightbox, close, prev, next]);

  return (
    <section className="py-16 sm:py-20 px-4 bg-gradient-to-b from-gold-50 to-cream">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">
            Visual Journey
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2 mb-3">
            Divine Moments — Tamil Nadu Temple Gallery
          </h2>
          <p className="text-base text-navy-900/70 max-w-2xl mx-auto">
            A visual journey through ancient architecture, gopurams, festivals and sacred corridors.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {galleryImages.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setLightbox(idx)}
              className={`group relative rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 ${
                idx === 0 ? 'col-span-2 row-span-2 h-64 md:h-80' : 'h-40 md:h-48'
              }`}
            >
              <img
                src={img.url}
                alt={img.caption}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <span className="text-[10px] uppercase tracking-wide text-gold-300 font-semibold">
                  {img.category}
                </span>
                <p className="text-xs sm:text-sm text-white font-medium line-clamp-1">{img.caption}</p>
              </div>
            </button>
          ))}
        </div>

        {showFullGalleryLink && (
          <div className="text-center mt-10">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white font-semibold rounded-lg hover:shadow-xl transition-all duration-300"
            >
              View Full Gallery
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-navy-950/95 flex items-center justify-center animate-fade-in p-4"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 sm:left-6 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 sm:right-6 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={galleryImages[lightbox].url}
              alt={galleryImages[lightbox].caption}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white text-sm mt-4 text-center font-medium">
              {galleryImages[lightbox].caption}
              <span className="block text-gold-300 text-xs mt-1">{galleryImages[lightbox].category}</span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
