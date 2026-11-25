import { useState } from 'react';
import { Siren, Phone, X, Shield, Hospital, AlertCircle } from 'lucide-react';

const QUICK_HELPLINES = [
  { name: 'Emergency', number: '112', icon: Siren, color: 'bg-red-600' },
  { name: 'Ambulance', number: '108', icon: Hospital, color: 'bg-red-500' },
  { name: 'Fire & Rescue', number: '101', icon: AlertCircle, color: 'bg-orange-600' },
  { name: 'Disaster Mgmt', number: '1077', icon: Shield, color: 'bg-amber-600' },
];

export default function FloatingEmergencyButton() {
  const [open, setOpen] = useState(false);
  const [confirmNumber, setConfirmNumber] = useState<string | null>(null);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-4 bottom-6 z-40 group flex items-center"
        aria-label="Emergency Assistance"
      >
        <span className="absolute right-0 whitespace-nowrap bg-white text-red-700 text-sm font-semibold px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 group-hover:-translate-x-14 transition-all duration-300 pointer-events-none">
          Emergency
        </span>
        <span className="relative w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl shadow-red-600/40 group-hover:bg-red-700 transition-colors">
          <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse-ring" />
          {open ? <X className="w-6 h-6 text-white relative z-10" /> : <Siren className="w-6 h-6 text-white relative z-10" />}
        </span>
      </button>

      {/* Emergency Panel */}
      {open && (
        <div className="fixed right-4 bottom-24 z-40 bg-white rounded-xl shadow-2xl border-2 border-red-200 p-4 w-72 animate-slide-up">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-red-100">
            <Siren className="w-5 h-5 text-red-600" />
            <h3 className="font-serif font-bold text-navy-900">Emergency Helplines</h3>
          </div>
          <div className="space-y-2">
            {QUICK_HELPLINES.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.name}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full ${h.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy-900">{h.name}</p>
                    <p className="text-lg font-bold text-red-700">{h.number}</p>
                  </div>
                  {confirmNumber === h.number ? (
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${h.number}`}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700"
                      >
                        Confirm
                      </a>
                      <button
                        onClick={() => setConfirmNumber(null)}
                        className="px-2 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-md"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmNumber(h.number)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md hover:bg-red-100 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      Call
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-navy-900/50 mt-3 pt-3 border-t border-red-100 text-center">
            Tap Call, then Confirm to dial. These are official emergency numbers.
          </p>
        </div>
      )}
    </>
  );
}
