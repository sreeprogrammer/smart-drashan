import type { ReactNode } from 'react';
import AdminHeader from '@/components/AdminHeader';
import NewsMarquee from '@/components/NewsMarquee';
import NavigationHeader from '@/components/NavigationHeader';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import Chatbot from '@/components/Chatbot';
import FloatingEmergencyButton from '@/components/FloatingEmergencyButton';

export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <NavigationHeader />
      <NewsMarquee />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <Chatbot />
      <FloatingEmergencyButton />
    </div>
  );
}
