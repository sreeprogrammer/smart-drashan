import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Trash2, Bot, Globe } from 'lucide-react';

type Lang = 'en' | 'ta';

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
  links?: { label: string; path: string }[];
}

interface FaqEntry {
  keywords: string[];
  en: string;
  ta: string;
  links?: { label: string; path: string }[];
}

const faq: FaqEntry[] = [
  {
    keywords: ['book', 'darshan', 'booking', 'how do i book', 'munnpathivu', 'முன்பதிவு'],
    en: 'To book temple darshan:\n1. Go to the Tickets page\n2. Select your district\n3. Choose a temple\n4. Pick a darshan type and date\n5. Select an available slot\n6. Fill in your details and confirm',
    ta: 'கோவில் தரிசன முன்பதிவு செய்ய:\n1. டிக்கெட் பக்கத்திற்கு செல்லவும்\n2. உங்கள் மாவட்டத்தைத் தேர்வு செய்யவும்\n3. ஒரு கோவிலைத் தேர்வு செய்யவும்\n4. தரிசன வகை மற்றும் தேதியைத் தேர்வு செய்யவும்\n5. கிடைக்கும் நேரத்தைத் தேர்வு செய்யவும்\n6. விவரங்களை நிரப்பி உறுதிசெய்யவும்',
    links: [{ label: 'Go to Tickets', path: '/tickets' }],
  },
  {
    keywords: ['district', 'select district', 'find district', 'mavattam', 'மாவட்டம்'],
    en: 'To select your district:\n1. Click "Districts" in the navigation\n2. Browse all 38 districts of Tamil Nadu\n3. Filter by region (North, South, Central, West)\n4. Click on your district to see its temples',
    ta: 'மாவட்டத்தைத் தேர்வு செய்ய:\n1. வழிசெலுத்தலில் "Districts" ஐக் கிளிக் செய்யவும்\n2. தமிழ்நாட்டின் அனைத்து 38 மாவட்டங்களையும் பார்க்கவும்\n3. பகுதி வாரியாக வடிகட்டவும்\n4. உங்கள் மாவட்டத்தைக் கிளிக் செய்து கோவில்களைப் பார்க்கவும்',
    links: [{ label: 'Explore Districts', path: '/districts' }],
  },
  {
    keywords: ['find temple', 'temples district', 'kovil', 'temple list', 'கோவில்களை'],
    en: 'To find temples district-wise:\n1. Select your district from the Districts page\n2. View all temples listed under that district\n3. Click any temple to see details, darshan timings and book slots',
    ta: 'மாவட்டம் வாரியாக கோவில்களைக் காண:\n1. Districts பக்கத்திலிருந்து உங்கள் மாவட்டத்தைத் தேர்வு செய்யவும்\n2. அந்த மாவட்டத்தின் கோவில்களைப் பார்க்கவும்\n3. கோவிலைக் கிளிக் செய்து விவரம், தரிசன நேரம் மற்றும் முன்பதிவைப் பார்க்கவும்',
    links: [{ label: 'View Temples', path: '/temples' }],
  },
  {
    keywords: ['specific temple', 'book temple', 'particular temple', 'குறிப்பிட்ட கோவில்'],
    en: 'To book a specific temple:\n1. Use the search box on the homepage\n2. Type the temple name or district\n3. Click the temple from results\n4. On the temple page, click "Book Darshan"',
    ta: 'குறிப்பிட்ட கோவிலுக்கு முன்பதிவு:\n1. முகப்பு பக்கத்தில் தேடல் பெட்டியைப் பயன்படுத்தவும்\n2. கோவில் பெயர் அல்லது மாவட்டத்தைத் தட்டச்சு செய்யவும்\n3. முடிவுகளிலிருந்து கோவிலைக் கிளிக் செய்யவும்\n4. கோவில் பக்கத்தில் "Book Darshan" ஐக் கிளிக் செய்யவும்',
    links: [{ label: 'Search Temples', path: '/temples' }],
  },
  {
    keywords: ['slot', 'available slot', 'time', 'timing', 'நேரம்', 'தரிசன நேரம்'],
    en: 'To check available darshan slots:\n1. Open the temple detail page\n2. Select your preferred date\n3. Available time slots will be displayed\n4. Choose a slot that suits you\n\nNote: Slot availability is shown in real-time from the booking system.',
    ta: 'தரிசன நேரத்தைப் பார்க்க:\n1. கோவில் விவரப் பக்கத்தைத் திறக்கவும்\n2. விரும்பிய தேதியைத் தேர்வு செய்யவும்\n3. கிடைக்கும் நேர இடங்கள் காட்டப்படும்\n4. உங்களுக்கு ஏற்ற நேரத்தைத் தேர்வு செய்யவும்',
    links: [{ label: 'Check Tickets', path: '/tickets' }],
  },
  {
    keywords: ['ticket', 'download', 'view ticket', 'my booking', 'டிக்கெட்', 'பதிவிறக்கம்'],
    en: 'To view or download your ticket:\n1. Go to the Tickets page\n2. Click "My Bookings" or sign in to your account\n3. Find your confirmed booking\n4. Click "Download Ticket" to get a PDF copy',
    ta: 'உங்கள் டிக்கெட்டைப் பார்க்க அல்லது பதிவிறக்க:\n1. டிக்கெட் பக்கத்திற்குச் செல்லவும்\n2. "My Bookings" ஐக் கிளிக் செய்யவும் அல்லது உங்கள் கணக்கில் உள்நுழையவும்\n3. உறுதிசெய்த முன்பதிவைக் காணவும்\n4. "Download Ticket" ஐக் கிளிக் செய்து PDF பெறவும்',
    links: [{ label: 'My Tickets', path: '/tickets' }],
  },
  {
    keywords: ['navigate', 'website', 'how to', 'page', 'where', 'வழிகாட்டி'],
    en: 'Website navigation:\n• Home — overview and search\n• Districts — all 38 districts\n• Temples — browse all temples\n• Map — interactive temple map\n• Tickets — booking and your tickets\n• News & Events — latest updates\n• Gallery — temple photos',
    ta: 'வலைத்தள வழிசெலுத்தல்:\n• Home — முகப்பு மற்றும் தேடல்\n• Districts — அனைத்து 38 மாவட்டங்கள்\n• Temples — அனைத்து கோவில்கள்\n• Map — ஊடாடும் கோவில் வரைபடம்\n• Tickets — முன்பதிவு\n• News & Events — புதிய தகவல்கள்\n• Gallery — கோவில் படங்கள்',
  },
];

const welcome: Record<Lang, string> = {
  en: 'Welcome to Smart Darshan! I can help you understand temple and district-wise darshan booking in Tamil Nadu. How can I assist you?',
  ta: 'ஸ்மார்ட் தரிசனத்திற்கு வரவேற்கிறோம்! தமிழ்நாட்டில் மாவட்டம் மற்றும் கோவில் வாரியாக தரிசன முன்பதிவு செய்வது குறித்து உங்களுக்கு உதவுகிறேன். என்ன உதவி வேண்டும்?',
};

const outOfScope: Record<Lang, string> = {
  en: 'I can only assist with Smart Darshan temple booking, district selection and temple-related booking guidance.',
  ta: 'ஸ்மார்ட் தரிசனத்தில் கோவில் முன்பதிவு, மாவட்டத் தேர்வு மற்றும் கோவில் தொடர்பான முன்பதிவு வழிகாட்டுதல்களுக்கு மட்டுமே என்னால் உதவ முடியும்.',
};

const suggestions: Record<Lang, string[]> = {
  en: [
    'How do I book temple darshan?',
    'How can I find temples district-wise?',
    'How do I select a district?',
    'How can I book a specific temple?',
    'How do I check available slots?',
    'How can I download my ticket?',
  ],
  ta: [
    'கோவில் தரிசனத்திற்கு எப்படி முன்பதிவு செய்வது?',
    'மாவட்டம் வாரியாக கோவில்களை எப்படி பார்ப்பது?',
    'மாவட்டத்தை எப்படி தேர்வு செய்வது?',
    'குறிப்பிட்ட கோவிலுக்கு எப்படி முன்பதிவு செய்வது?',
    'தரிசன நேரத்தை எப்படி பார்ப்பது?',
    'முன்பதிவு செய்த டிக்கெட்டை எப்படி பதிவிறக்கம் செய்வது?',
  ],
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unscroll, setUnscroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: 'bot', text: welcome[lang] }]);
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current && !unscroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, unscroll]);

  const findAnswer = useCallback(
    (text: string): ChatMessage => {
      const lower = text.toLowerCase().trim();
      for (const entry of faq) {
        if (entry.keywords.some((k) => lower.includes(k.toLowerCase()))) {
          return { role: 'bot', text: entry[lang], links: entry.links };
        }
      }
      return { role: 'bot', text: outOfScope[lang] };
    },
    [lang]
  );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: 'user', text: trimmed }]);
    setInput('');
    setUnscroll(false);
    setTyping(true);
    setTimeout(() => {
      const answer = findAnswer(trimmed);
      setTyping(false);
      setMessages((m) => [...m, answer]);
    }, 800);
  };

  const clearChat = () => {
    setMessages([{ role: 'bot', text: welcome[lang] }]);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-maroon-deep to-maroon-800 flex items-center justify-center shadow-xl shadow-maroon-deep/40 transition-transform border-2 border-gold-accent/40"
          aria-label="Open Smart Darshan Assistant"
        >
          <span className="absolute inset-0 rounded-full bg-gold-accent/30 animate-pulse-ring" />
          <MessageCircle className="w-7 h-7 text-gold-300 relative z-10" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed right-4 bottom-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-md animate-scale-in">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gold-accent/30 max-h-[85vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-maroon-deep to-maroon-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-maroon-deep" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Smart Darshan Assistant</h3>
                  <span className="text-[10px] text-gold-300">Online now</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language selector */}
            <div className="bg-gold-50 px-4 py-2 flex items-center justify-between border-b border-gold-100">
              <div className="flex items-center gap-1.5 text-xs text-navy-900/60">
                <Globe className="w-3.5 h-3.5" />
                <span>Language</span>
              </div>
              <div className="flex bg-white rounded-full p-0.5 border border-gold-200">
                {(['en', 'ta'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                      lang === l ? 'bg-maroon-deep text-white' : 'text-navy-900/60 hover:text-navy-900'
                    }`}
                  >
                    {l === 'en' ? 'English' : 'தமிழ்'}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-cream/50 min-h-[200px] max-h-[40vh]">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-maroon-deep text-white rounded-br-sm'
                        : 'bg-white text-navy-900 rounded-bl-sm shadow-sm border border-gold-100'
                    }`}
                  >
                    {msg.text}
                    {msg.links && msg.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.links.map((link) => (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setOpen(false)}
                            className="inline-block text-xs font-semibold text-gold-700 bg-gold-100 hover:bg-gold-200 px-2.5 py-1 rounded-full transition-colors"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm border border-gold-100 px-4 py-3 flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 bg-cream/30 border-t border-gold-100">
                <p className="text-[10px] text-navy-900/50 mb-1.5 uppercase tracking-wide font-medium">
                  {lang === 'en' ? 'Suggested questions' : 'பரிந்துரைக்கப்பட்ட கேள்விகள்'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions[lang].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => send(q)}
                      className="text-xs text-navy-900/70 bg-white border border-gold-200 hover:border-gold-accent hover:bg-gold-50 px-2.5 py-1 rounded-full transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-2.5 bg-white border-t border-gold-100 flex items-center gap-2">
              {messages.length > 1 && (
                <button
                  onClick={clearChat}
                  className="text-navy-900/40 hover:text-maroon-deep p-1.5 transition-colors"
                  aria-label="Clear chat"
                  title={lang === 'en' ? 'Clear chat' : 'அரட்டையை அழி'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
                placeholder={lang === 'en' ? 'Type your question...' : 'உங்கள் கேள்வியைத் தட்டச்சு செய்யவும்...'}
                className="flex-1 text-sm bg-cream/50 rounded-full px-3.5 py-2 text-navy-900 placeholder:text-navy-900/40 focus:outline-none focus:ring-2 focus:ring-gold-accent/40"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-maroon-deep to-maroon-800 text-gold-300 flex items-center justify-center disabled:opacity-40 hover:shadow-lg transition-all flex-shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
