import { Link } from 'react-router-dom';
import { MapPin, Church, CalendarCheck, Ticket, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: MapPin,
    title: 'Select Your District',
    description: 'Choose your preferred Tamil Nadu district from the 38 available districts.',
  },
  {
    icon: Church,
    title: 'Explore Temples',
    description: 'Discover temples available in the selected district. View temple details and darshan information.',
  },
  {
    icon: CalendarCheck,
    title: 'Select Darshan & Date',
    description: 'Choose the available darshan option and date. View available booking slots from the existing booking system.',
  },
  {
    icon: Ticket,
    title: 'Confirm Your Booking',
    description: 'Complete the required booking information. Confirm your booking and view or download your ticket.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-20 px-4 bg-navy-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, #D4AF37 1px, transparent 1px), radial-gradient(circle at 80% 20%, #D4AF37 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-gold-400 uppercase tracking-[0.2em]">
            Simple Process
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-2 mb-3">
            How Smart Darshan Works
          </h2>
          <p className="text-base text-cream/70 max-w-2xl mx-auto">
            Your pilgrimage journey made simpler, smarter and more convenient.
          </p>
        </div>

        {/* Desktop horizontal stepper */}
        <div className="hidden md:grid grid-cols-4 gap-4 relative">
          {/* Connecting line */}
          <div className="absolute top-10 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-gold-accent/20 via-gold-accent/50 to-gold-accent/20" />

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative flex flex-col items-center text-center px-2">
                <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-maroon-deep to-maroon-800 flex items-center justify-center shadow-xl border-2 border-gold-accent/40 transition-transform duration-300">
                  <Icon className="w-8 h-8 text-gold-300" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gold-accent text-maroon-deep text-sm font-bold flex items-center justify-center shadow-lg">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-white mt-4 mb-2">{step.title}</h3>
                <p className="text-sm text-cream/70 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* Mobile vertical stepper */}
        <div className="md:hidden space-y-6 relative">
          <div className="absolute left-10 top-5 bottom-5 w-0.5 bg-gold-accent/30" />
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative flex gap-4 items-start">
                <div className="relative z-10 flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-maroon-deep to-maroon-800 flex items-center justify-center shadow-xl border-2 border-gold-accent/40">
                  <Icon className="w-7 h-7 text-gold-300" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold-accent text-maroon-deep text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="font-serif text-base font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-cream/70 leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-gold-300 to-gold-500 text-maroon-deep font-bold rounded-lg hover:from-gold-400 hover:to-gold-600 hover:shadow-xl hover:shadow-gold-500/30 transition-all duration-300"
          >
            Start Your Darshan Journey
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
