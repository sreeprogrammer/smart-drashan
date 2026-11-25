import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Shield, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-navy-900 to-maroon-deep text-cream pt-14 pb-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Column 1 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/tamilnadu-logo.png"
                alt="Tamil Nadu temple guide logo"
                className="h-12 w-20 rounded-md object-contain shadow-lg ring-1 ring-gold-accent/40"
              />
              <div>
                <h3 className="font-serif text-lg font-bold text-white">SMART DARSHAN</h3>
                <p className="text-[10px] text-gold-300 uppercase tracking-wide">Tamil Nadu Temple Guide</p>
              </div>
            </div>
            <p className="text-sm text-cream/70 leading-relaxed">
              An AI-powered pilgrimage management platform for Tamil Nadu, offering smart darshan slot
              allocation, crowd intelligence and seamless temple booking across all 38 districts.
            </p>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="font-serif text-base font-semibold text-gold-300 mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', path: '/' },
                { label: 'Districts', path: '/districts' },
                { label: 'Temples', path: '/temples' },
                { label: 'Map', path: '/map' },
                { label: 'Tickets', path: '/tickets' },
              ].map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-sm text-cream/70 hover:text-gold-300 transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-gold-accent/50 group-hover:bg-gold-accent transition-colors" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="font-serif text-base font-semibold text-gold-300 mb-4">Information</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', path: '/about' },
                { label: 'News & Events', path: '/news' },
                { label: 'Gallery', path: '/gallery' },
                { label: 'FAQs', path: '/faq' },
                { label: 'Contact Us', path: '/contact' },
              ].map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-sm text-cream/70 hover:text-gold-300 transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-gold-accent/50 group-hover:bg-gold-accent transition-colors" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h4 className="font-serif text-base font-semibold text-gold-300 mb-4">Contact Information</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/918428727411?text=Hello%20Smart%20Darshan%2C%20I%20need%20assistance%20with%20temple%20darshan%20booking."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-cream/70 hover:text-gold-300 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  WhatsApp Contact
                </a>
              </li>
              <li>
                <a href="tel:8428727411" className="flex items-center gap-3 text-sm text-cream/70 hover:text-gold-300 transition-colors">
                  <Phone className="w-4 h-4 text-gold-300 flex-shrink-0" />
                  8428727411
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-cream/70">
                <Shield className="w-4 h-4 text-gold-300 flex-shrink-0" />
                Admin: <Link to="/admin/login" className="hover:text-gold-300 transition-colors">Login</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gold-accent/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream/60 text-center sm:text-left">
            &copy; {new Date().getFullYear()} Smart Darshan — Tamil Nadu Temple Guide. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-cream/60">
            <Link to="/privacy" className="hover:text-gold-300 transition-colors">Privacy Policy</Link>
            <span className="text-gold-accent/30">|</span>
            <Link to="/terms" className="hover:text-gold-300 transition-colors">Terms &amp; Conditions</Link>
            <span className="text-gold-accent/30">|</span>
            <Link to="/disclaimer" className="hover:text-gold-300 transition-colors">Disclaimer</Link>
          </div>
        </div>

        <p className="text-center text-[10px] text-cream/40 mt-4 flex items-center justify-center gap-1">
          Made with <Heart className="w-3 h-3 text-maroon-300 fill-maroon-300" /> sreegokul
        </p>
      </div>
    </footer>
  );
}
