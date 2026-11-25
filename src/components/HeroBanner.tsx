import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Church, MapPin } from 'lucide-react';
import { heroSlides } from '@/data/content';

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % heroSlides.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + heroSlides.length) % heroSlides.length), []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  return (
    <section
      className="relative w-full h-[70vh] min-h-[480px] max-h-[720px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {heroSlides.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            idx === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.caption}
            className="h-full w-full object-cover"
            loading={idx === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-0 hero-overlay" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight animate-fade-in drop-shadow-lg">
          Discover the Divine Heritage
          <span className="block text-gradient-gold mt-1">of Tamil Nadu</span>
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-cream/90 max-w-2xl mb-8 leading-relaxed animate-fade-slide">
          Explore ancient temples, discover sacred destinations, and experience smarter pilgrimage
          planning with Smart Darshan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-slide">
          <Link
            to="/temples"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-300 to-gold-500 text-maroon-deep font-semibold rounded-lg hover:from-gold-400 hover:to-gold-600 hover:shadow-xl hover:shadow-gold-500/40 transition-all duration-300"
          >
            <Church className="w-5 h-5" />
            Explore Temples
          </Link>
          <Link
            to="/districts"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg border border-white/30 hover:bg-white/20 transition-all duration-300"
          >
            <MapPin className="w-5 h-5" />
            Explore Districts
          </Link>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full glass-dark text-white flex items-center justify-center hover:bg-maroon-deep/70 transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full glass-dark text-white flex items-center justify-center hover:bg-maroon-deep/70 transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroSlides.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => setCurrent(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === current ? 'w-8 bg-gold-accent' : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Caption */}
      <div className="absolute bottom-5 right-5 z-10 hidden md:block">
        <span className="text-xs text-cream/60 font-medium tracking-wide">
          {heroSlides[current].caption}
        </span>
      </div>
    </section>
  );
}
