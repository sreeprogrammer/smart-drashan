import { Link } from 'react-router-dom';
import { Church, ArrowLeft, Construction } from 'lucide-react';
import type { ReactNode } from 'react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export default function PlaceholderPage({ title, description, children }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-maroon-deep to-maroon-800 flex items-center justify-center shadow-xl border-2 border-gold-accent/30">
            <Church className="w-10 h-10 text-gold-300" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mb-4">{title}</h1>
          <p className="text-base text-navy-900/70 mb-8 leading-relaxed">{description}</p>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gold-200 mb-8 inline-flex items-center gap-3 text-sm text-navy-900/60">
            <Construction className="w-5 h-5 text-gold-600 flex-shrink-0" />
            <span>This page is part of the full Smart Darshan application.</span>
          </div>

          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white font-semibold rounded-lg hover:shadow-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
