import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Church,
  Compass,
  Eye,
  Images,
  Languages,
  Landmark,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Route,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Ticket,
  QrCode,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';

const WHATSAPP_URL =
  'https://wa.me/918428727411?text=Hello%20Smart%20Darshan%2C%20I%20need%20assistance%20with%20temple%20darshan%20booking.';

const HERO_IMAGE = 'https://images.pexels.com/photos/37626293/pexels-photo-37626293.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const INTRO_IMAGE = 'https://images.pexels.com/photos/39033969/pexels-photo-39033969.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const MISSION_POINTS = [
  'Digital temple discovery',
  'Convenient darshan booking',
  'District-wise temple information',
  'Better visitor guidance',
  'Transparent booking information',
  'Improved pilgrimage accessibility',
  'Preservation of Tamil Nadu temple heritage',
];

const OFFERINGS = [
  { title: 'Explore 38 Districts', description: 'Browse every district of Tamil Nadu and the temples within it.', icon: Compass, to: '/districts' },
  { title: 'Discover Temples', description: 'Find temples by name, district and the services they offer.', icon: Church, to: '/temples' },
  { title: 'Online Darshan Booking', description: 'Choose an available slot and receive a digital ticket.', icon: Ticket, to: '/tickets' },
  { title: 'Local and Special Darshan', description: 'Book the darshan category that suits your visit.', icon: CalendarCheck, to: '/tickets' },
  { title: 'Tamil Nadu Temple Map', description: 'See temples on an interactive map and plan your route.', icon: MapIcon, to: '/map' },
  { title: 'Temple News & Events', description: 'Read verified announcements and upcoming festival dates.', icon: Newspaper, to: '/news' },
  { title: 'Temple Gallery', description: 'Browse photographs of temples across the state.', icon: Images, to: '/gallery' },
  { title: 'Emergency Contact Information', description: 'Quick access to emergency helplines when you need them.', icon: ShieldAlert, href: 'tel:112' },
  { title: 'Bilingual English and Tamil Chatbot', description: 'Ask questions in English or Tamil on WhatsApp.', icon: Languages, href: WHATSAPP_URL },
  { title: 'Temple Facilities and Nearby Services', description: 'Check facilities and services listed for each temple.', icon: Building2, to: '/temples' },
];

const BENEFITS = [
  { title: 'Easy Temple Discovery', icon: Search },
  { title: 'District-Wise Information', icon: MapPin },
  { title: 'Convenient Online Booking', icon: Ticket },
  { title: 'Transparent Slot Availability', icon: CalendarCheck },
  { title: 'Digital Ticket Access', icon: QrCode },
  { title: 'English and Tamil Support', icon: Languages },
  { title: 'Location-Based Temple Guidance', icon: Route },
  { title: 'Emergency Assistance', icon: ShieldAlert },
];

const HERITAGE_HIGHLIGHTS = [
  {
    title: 'Dravidian Architecture',
    description: 'Temple complexes built in the Dravidian style, with carved pillars and layered halls.',
    image: 'https://images.pexels.com/photos/38349288/pexels-photo-38349288.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    alt: 'Ornate gopuram of a Tamil Nadu temple at night',
  },
  {
    title: 'Historic Temple Towers',
    description: 'Gopurams rise above the streets of many towns, marking the entrance to each sacred precinct.',
    image: 'https://images.pexels.com/photos/7915949/pexels-photo-7915949.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    alt: 'Temple tower of Annamalaiyar Temple in Tamil Nadu',
  },
  {
    title: 'Temple Sculptures',
    description: 'Detailed stone and painted sculptures decorate the facades and pillars of temples across the state.',
    image: 'https://images.pexels.com/photos/6667281/pexels-photo-6667281.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    alt: 'Colourful sculpted facade of a Hindu temple in Chennai',
  },
];

const HOW_STEPS = [
  { step: '01', title: 'Discover', description: 'Explore districts and temples across Tamil Nadu.', icon: Compass },
  { step: '02', title: 'Plan', description: 'View temple details, facilities and location on the map.', icon: MapIcon },
  { step: '03', title: 'Book', description: 'Select an eligible darshan slot that suits your visit.', icon: CalendarCheck },
  { step: '04', title: 'Visit', description: 'Show your digital ticket and follow temple guidance on arrival.', icon: QrCode },
];

export default function AboutPage() {
  return (
    <PageLayout>
      <section className="relative text-white overflow-hidden">
        <img src={HERO_IMAGE} alt="Gopuram of a Tamil Nadu temple against the sky" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950/95 via-navy-900/85 to-maroon-deep/80" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-cream/80 mb-6">
            <Link to="/" className="hover:text-white">Home</Link>
            <span aria-hidden="true">→</span>
            <span className="text-gold-300">About Us</span>
          </nav>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-gold-300 max-w-3xl leading-tight mb-5">
            About Smart Darshan
          </h1>
          <p className="text-lg sm:text-xl text-cream/90 max-w-2xl leading-relaxed">
            Connecting devotees with the spiritual heritage of Tamil Nadu through smarter pilgrimage planning.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div>
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">Introduction</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2 mb-6">Who We Are</h2>
          <div className="space-y-4 text-navy-900/80 leading-relaxed">
            <p>
              Smart Darshan is an AI-powered digital pilgrimage management platform designed to simplify temple discovery and darshan planning across Tamil Nadu.
            </p>
            <p>
              Our platform brings together district-wise temple information, digital darshan booking, temple updates, interactive maps, visitor assistance and pilgrimage-related information in one convenient place.
            </p>
            <p>
              We aim to make temple visits more organized, accessible and convenient through technology while preserving the cultural and spiritual heritage of Tamil Nadu.
            </p>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3]">
          <img src={INTRO_IMAGE} alt="Carved gopuram of a Tamil Nadu temple" loading="lazy" className="w-full h-full object-cover" />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-16 sm:pb-20 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-navy-900 text-white p-8 sm:p-10 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-gold-400/20 flex items-center justify-center mb-5">
            <Eye className="w-6 h-6 text-gold-300" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gold-300 mb-4">Our Vision</h2>
          <p className="text-cream/90 leading-relaxed">
            To create a smarter, more accessible and organized digital pilgrimage experience for devotees visiting temples across Tamil Nadu.
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-navy-900/10 p-8 sm:p-10 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-maroon-deep/10 flex items-center justify-center mb-5">
            <Target className="w-6 h-6 text-maroon-deep" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-4">Our Mission</h2>
          <p className="text-navy-900/80 leading-relaxed mb-6">
            Our mission is to simplify temple discovery, improve darshan planning, provide reliable temple information and support devotees through technology-driven pilgrimage services.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {MISSION_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-navy-900">
                <Sparkles className="w-4 h-4 text-gold-600 mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white/60 border-y border-navy-900/5 py-16 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">Services</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2">What We Offer</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {OFFERINGS.map((item) => {
              const Icon = item.icon;
              const cardBody = (
                <>
                  <div className="w-11 h-11 rounded-lg bg-gold-100 flex items-center justify-center mb-4 group-hover:bg-maroon-deep transition-colors">
                    <Icon className="w-5 h-5 text-maroon-deep group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-navy-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-navy-900/70 leading-relaxed mb-5">{item.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-maroon-deep">
                    Explore
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </>
              );
              const cardClass =
                'group flex flex-col bg-white rounded-xl border border-navy-900/10 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300';
              return item.to ? (
                <Link key={item.title} to={item.to} className={cardClass}>
                  {cardBody}
                </Link>
              ) : (
                <a key={item.title} href={item.href} className={cardClass}>
                  {cardBody}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">Benefits</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2">Why Choose Smart Darshan?</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="bg-white rounded-xl border border-navy-900/10 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-gold-400/60 transition-all duration-300"
              >
                <Icon className="w-7 h-7 text-gold-600 mb-4" />
                <h3 className="font-semibold text-navy-900 text-sm sm:text-base leading-snug">{benefit.title}</h3>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-navy-900 text-white py-16 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-gold-300 uppercase tracking-[0.2em]">Heritage</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gold-300 mt-2 mb-3">
              Celebrating the Spiritual Heritage of Tamil Nadu
            </h2>
            <p className="text-cream/80 max-w-2xl mx-auto">
              Temples across the state reflect centuries of architecture, craft and devotion.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HERITAGE_HIGHLIGHTS.map((item) => (
              <article key={item.title} className="group rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.alt}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl font-bold text-gold-300 mb-2">{item.title}</h3>
                  <p className="text-sm text-cream/80 leading-relaxed">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">Your Visit</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2">How Smart Darshan Helps Devotees</h2>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {HOW_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.step} className="relative bg-white rounded-xl border border-navy-900/10 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <span className="w-11 h-11 rounded-full bg-maroon-deep text-white flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-serif text-2xl font-bold text-gold-600">{item.step}</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-navy-900 mb-2">{item.title}</h3>
                <p className="text-sm text-navy-900/70 leading-relaxed">{item.description}</p>
              </li>
            );
          })}
        </ol>
        <div className="text-center mt-10">
          <Link
            to="/temples"
            className="inline-flex items-center gap-2 px-8 py-3 bg-maroon-deep text-white font-semibold rounded-lg hover:shadow-xl transition-shadow duration-300"
          >
            Explore Temples
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <section className="bg-white/60 border-t border-navy-900/5 py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-[0.2em]">Support</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2 mb-4">We're Here to Help</h2>
          <p className="text-navy-900/70 mb-10">Reach our team on WhatsApp or find answers in our help resources.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 bg-white rounded-xl border border-navy-900/10 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <MessageCircle className="w-7 h-7 text-gold-600" />
              <span className="font-semibold text-navy-900">WhatsApp 8428727411</span>
            </a>
            <Link to="/contact" className="flex flex-col items-center gap-2 bg-white rounded-xl border border-navy-900/10 p-6 shadow-sm hover:shadow-md transition-shadow">
              <Phone className="w-7 h-7 text-gold-600" />
              <span className="font-semibold text-navy-900">Contact Us</span>
            </Link>
            <Link to="/faq" className="flex flex-col items-center gap-2 bg-white rounded-xl border border-navy-900/10 p-6 shadow-sm hover:shadow-md transition-shadow">
              <Landmark className="w-7 h-7 text-gold-600" />
              <span className="font-semibold text-navy-900">Frequently Asked Questions</span>
            </Link>
            <Link to="/news" className="flex flex-col items-center gap-2 bg-white rounded-xl border border-navy-900/10 p-6 shadow-sm hover:shadow-md transition-shadow">
              <Newspaper className="w-7 h-7 text-gold-600" />
              <span className="font-semibold text-navy-900">News &amp; Events</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto rounded-2xl bg-gradient-to-br from-navy-900 to-maroon-deep text-white p-8 sm:p-14 text-center shadow-xl">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gold-300 mb-4">
            Begin Your Spiritual Journey with Smart Darshan
          </h2>
          <p className="text-cream/85 max-w-2xl mx-auto mb-8">
            Explore Tamil Nadu's sacred destinations and plan your next temple visit with ease.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/temples" className="inline-flex items-center gap-2 px-7 py-3 bg-gold-400 text-navy-900 font-semibold rounded-lg hover:bg-gold-300 transition-colors">
              <Church className="w-5 h-5" />
              Explore Temples
            </Link>
            <Link to="/districts" className="inline-flex items-center gap-2 px-7 py-3 border border-gold-300 text-gold-300 font-semibold rounded-lg hover:bg-white/10 transition-colors">
              <MapPin className="w-5 h-5" />
              Explore Districts
            </Link>
            <Link to="/tickets" className="inline-flex items-center gap-2 px-7 py-3 border border-gold-300 text-gold-300 font-semibold rounded-lg hover:bg-white/10 transition-colors">
              <Ticket className="w-5 h-5" />
              Book Darshan
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
