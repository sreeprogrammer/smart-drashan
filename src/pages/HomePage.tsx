import AdminHeader from '@/components/AdminHeader';
import NewsMarquee from '@/components/NewsMarquee';
import NavigationHeader from '@/components/NavigationHeader';
import HeroBanner from '@/components/HeroBanner';
import SearchBox from '@/components/SearchBox';
import FamousTemples from '@/components/FamousTemples';
import ExploreDistricts from '@/components/ExploreDistricts';
import HowItWorks from '@/components/HowItWorks';
import NewsEvents from '@/components/NewsEvents';
import Gallery from '@/components/Gallery';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import Chatbot from '@/components/Chatbot';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />
      <NewsMarquee />
      <NavigationHeader />

      <main>
        <HeroBanner />
        <SearchBox />
        <FamousTemples />
        <ExploreDistricts />
        <HowItWorks />
        <NewsEvents />
        <Gallery />
      </main>

      <Footer />
      <WhatsAppButton />
      <Chatbot />
    </div>
  );
}
