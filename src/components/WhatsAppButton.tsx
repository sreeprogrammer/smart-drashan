import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '918428727411';
const PREFILL = 'Hello Smart Darshan, I need assistance with temple darshan booking.';

export default function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILL)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed left-4 bottom-6 z-40 flex items-center"
      aria-label="Contact us on WhatsApp"
    >
      <span className="absolute left-0 whitespace-nowrap bg-white text-navy-900 text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-14 transition-all duration-300 pointer-events-none">
        Contact us on WhatsApp
      </span>
      <span className="relative w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-xl shadow-green-500/40 group-hover:bg-green-600 transition-colors">
        <span className="absolute inset-0 rounded-full bg-green-400 animate-pulse-ring" />
        <MessageCircle className="w-7 h-7 text-white relative z-10" />
      </span>
    </a>
  );
}
