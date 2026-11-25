import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { temples } from '@/data/content';

export default function FamousTemples() {
  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">
            Sacred Destinations
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2 mb-3">
            Explore Famous Temples of Tamil Nadu
          </h2>
          <p className="text-base text-navy-900/70 max-w-2xl mx-auto">
            Discover the architectural beauty, history and spiritual significance of Tamil Nadu's
            sacred temples.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {temples.map((temple) => (
            <Link
              key={temple.id}
              to={`/temples/${temple.id}`}
              className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-white"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={temple.image}
                  alt={temple.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500"
                />
                <div className="absolute inset-0 card-overlay" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-200 bg-maroon-deep/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <MapPin className="w-3 h-3" />
                    {temple.district}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-serif text-lg font-bold text-navy-900 group-hover:text-maroon-deep transition-colors mb-2">
                  {temple.name}
                </h3>
                <p className="text-sm text-navy-900/70 line-clamp-2 mb-4">{temple.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gold-700">{temple.deity}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-maroon-deep group-hover:gap-2 transition-all">
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/temples"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-maroon-deep/30 transition-all duration-300"
          >
            Explore All Temples
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
