import { useState } from 'react';
import {
  Siren, Shield, Hospital, AlertCircle, Phone, MapPin, Navigation, Loader2,
  Church, Crosshair,
} from 'lucide-react';
import type { District } from '@/lib/supabase';

interface EmergencySectionProps {
  districts: District[];
  userLocation: [number, number] | null;
}

const HELPLINES = [
  { name: 'All-in-One Emergency', number: '112', icon: Siren, color: 'red', desc: 'National emergency number for police, fire, and ambulance' },
  { name: 'Police', number: '100', icon: Shield, color: 'blue', desc: 'Police emergency assistance' },
  { name: 'Ambulance', number: '108', icon: Hospital, color: 'red', desc: 'Free ambulance service (108)' },
  { name: 'Fire & Rescue', number: '101', icon: AlertCircle, color: 'orange', desc: 'Fire and rescue emergency service' },
  { name: 'Disaster Management', number: '1077', icon: Siren, color: 'amber', desc: 'Disaster management helpline' },
  { name: 'Child Helpline', number: '1098', icon: Church, color: 'green', desc: '24/7 child helpline for children in distress' },
  { name: 'Women Helpline', number: '181', icon: Shield, color: 'purple', desc: 'Women helpline for support and assistance' },
];

const colorClasses: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconBg: 'bg-green-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', iconBg: 'bg-purple-600' },
};

export default function EmergencySection({ districts, userLocation }: EmergencySectionProps) {
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [confirmCall, setConfirmCall] = useState<string | null>(null);

  const districtName = districts.find((d) => d.id === selectedDistrict)?.name || 'Tamil Nadu';

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-gold-50 to-cream">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
            <Siren className="w-7 h-7 text-red-600" />
          </div>
          <span className="text-xs font-semibold text-red-700 uppercase tracking-[0.2em]">
            Emergency Assistance
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mt-2 mb-3">
            Emergency Assistance – Tamil Nadu
          </h2>
          <p className="text-base text-navy-900/70 max-w-2xl mx-auto">
            Your safety matters. Find emergency services and important contact information during your pilgrimage.
          </p>
        </div>

        {/* Helpline Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          {HELPLINES.map((helpline) => {
            const c = colorClasses[helpline.color];
            const Icon = helpline.icon;
            return (
              <div
                key={helpline.name}
                className={`rounded-xl p-5 border ${c.bg} ${c.border} shadow-sm hover:shadow-md transition-all`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-lg ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-navy-900 text-sm leading-tight">{helpline.name}</h3>
                    <p className={`text-2xl font-bold ${c.text} mt-1`}>{helpline.number}</p>
                  </div>
                </div>
                <p className="text-xs text-navy-900/60 mb-3">{helpline.desc}</p>
                {confirmCall === helpline.number ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${helpline.number}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors animate-pulse"
                    >
                      <Phone className="w-4 h-4" />
                      Confirm Call
                    </a>
                    <button
                      onClick={() => setConfirmCall(null)}
                      className="px-3 py-2 bg-white border border-navy-900/20 text-navy-900/70 text-sm font-medium rounded-lg hover:bg-navy-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCall(helpline.number)}
                    className={`flex items-center justify-center gap-1.5 w-full px-3 py-2 ${c.iconBg} text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity`}
                  >
                    <Phone className="w-4 h-4" />
                    Call Now
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

