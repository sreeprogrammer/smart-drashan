import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Church, LogIn, UserPlus, Ticket } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Districts', path: '/districts' },
  { label: 'Temples', path: '/temples' },
  { label: 'Map', path: '/map' },
  { label: 'Tickets', path: '/tickets' },
  { label: 'My Tickets', path: '/my-tickets' },
  { label: 'News & Events', path: '/news' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'About Us', path: '/about' },
];

export default function NavigationHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, adminRole } = useAuth();
  const dashboardPath = adminRole === 'state_admin'
    ? '/state-admin'
    : adminRole === 'district_admin'
      ? '/district-admin'
      : adminRole === 'temple_admin' || adminRole === 'temple_staff'
        ? '/admin'
        : '/dashboard';
  const dashboardLabel = adminRole === 'state_admin'
    ? 'State Admin'
    : adminRole === 'district_admin'
      ? 'District Admin'
      : adminRole === 'temple_admin' || adminRole === 'temple_staff'
        ? 'Admin Dashboard'
        : 'My Account';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    if (mobileOpen) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', escHandler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [mobileOpen]);

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'glass-dark shadow-lg shadow-navy-900/30'
          : 'bg-gradient-to-r from-navy-900/80 to-maroon-deep/80 backdrop-blur-md'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between lg:h-20">
          {/* Logo */}
          <Link to="/" className="group flex flex-shrink-0 items-center gap-3">
            <div className="relative">
              <img
                src="/images/tamilnadu-logo.png"
                alt="Tamil Nadu temple guide logo"
                className="h-12 w-20 rounded-md object-contain shadow-lg shadow-gold-600/30 ring-1 ring-gold-accent/40 transition-transform duration-300 lg:h-14 lg:w-24"
              />
              <div className="absolute -inset-1 rounded-md border border-gold-accent/20 group-hover:border-gold-accent/60 transition-colors" />
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="whitespace-nowrap font-serif text-base font-bold tracking-wide text-white lg:text-xl">
                SMART DARSHAN
              </span>
              <span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.1em] text-gold-300 lg:text-[10px]">
                Tamil Nadu Temple Guide
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden xl:flex items-center gap-0.5 whitespace-nowrap">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative rounded-md px-2 py-2 text-[13px] font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'text-gold-300'
                    : 'text-cream/90 hover:bg-white/5 hover:text-gold-200'
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold-accent" />
                )}
              </Link>
            ))}
            <div className="ml-1">
              {user ? (
                <Link to={dashboardPath} className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-gold-accent/40 px-3 py-2 text-xs font-semibold text-cream transition-all duration-200 hover:bg-gold-accent/10">
                  {adminRole === 'visitor' ? <LogIn className="h-4 w-4" /> : <Church className="h-4 w-4" />}
                  {dashboardLabel}
                </Link>
              ) : (
                <Link
                  to="/signin"
                  className="flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-semibold text-cream transition-all duration-200 hover:text-gold-200"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 text-cream rounded-md hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div ref={menuRef} className="xl:hidden glass-dark border-t border-gold-accent/20 animate-slide-up">
          <div className="px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive(link.path)
                    ? 'text-gold-300 bg-gold-accent/10'
                    : 'text-cream/90 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gold-accent/20 flex gap-3">
              <Link
                to="/my-tickets"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-cream border border-gold-accent/40 rounded-md hover:bg-gold-accent/10 transition-colors"
              >
                <Ticket className="w-4 h-4" />
                My Tickets
              </Link>
              {user ? (
                <Link to={dashboardPath} className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-gold-300 to-gold-500 px-4 py-2.5 text-sm font-semibold text-maroon-deep">
                  <UserPlus className="h-4 w-4" />{dashboardLabel}
                </Link>
              ) : (
                <Link to="/register" className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-gold-300 to-gold-500 px-4 py-2.5 text-sm font-semibold text-maroon-deep">
                  <UserPlus className="h-4 w-4" />Sign Up
                </Link>
              )}
            </div>
            {!user && <Link
              to="/signin"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-gold-accent/40 px-4 py-2.5 text-sm font-medium text-cream hover:bg-gold-accent/10"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>}
          </div>
        </div>
      )}
    </header>
  );
}
