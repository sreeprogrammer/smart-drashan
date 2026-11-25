import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import HomePage from '@/pages/HomePage';
import DistrictsPage from '@/pages/DistrictsPage';
import DistrictDetailPage from '@/pages/DistrictDetailPage';
import TemplesPage from '@/pages/TemplesPage';
import TempleDetailPage from '@/pages/TempleDetailPage';
import TempleMapPage from '@/pages/TempleMapPage';
import BookingPage from '@/pages/BookingPage';
import MyTicketsPage from '@/pages/MyTicketsPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminNewsPage from '@/pages/AdminNewsPage';
import NewsPage from '@/pages/NewsPage';
import DistrictNewsPage from '@/pages/DistrictNewsPage';
import NewsDetailPage from '@/pages/NewsDetailPage';
import AboutPage from '@/pages/AboutPage';
import SeniorVerificationPage from '@/pages/SeniorVerificationPage';
import AdminSeniorVerificationsPage from '@/pages/AdminSeniorVerificationsPage';
import AdminSlotsPage from '@/pages/AdminSlotsPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import RegisterPage from '@/pages/RegisterPage';
import SignInPage from '@/pages/SignInPage';
import VisitorDashboardPage from '@/pages/VisitorDashboardPage';
import StateAdminDashboardPage from '@/pages/StateAdminDashboardPage';
import DistrictAdminDashboardPage from '@/pages/DistrictAdminDashboardPage';
import TempleInformationAdminPage from '@/pages/TempleInformationAdminPage';
import PlaceholderPage from '@/components/PlaceholderPage';
import PageLayout from '@/components/PageLayout';
import Gallery from '@/components/Gallery';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/districts" element={<DistrictsPage />} />
          <Route path="/districts/:id" element={<DistrictDetailPage />} />
          <Route path="/temples" element={<TemplesPage />} />
          <Route path="/temples/:id" element={<TempleDetailPage />} />
          <Route path="/map" element={<TempleMapPage />} />
          <Route path="/tickets" element={<BookingPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/district/:id" element={<DistrictNewsPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/admin/news" element={<AdminNewsPage />} />
          <Route path="/admin/senior-verifications" element={<AdminSeniorVerificationsPage />} />
          <Route path="/admin/slots" element={<AdminSlotsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/temple-information" element={<TempleInformationAdminPage />} />
          <Route path="/senior-verification" element={<SeniorVerificationPage />} />
          <Route
            path="/gallery"
            element={
              <PageLayout>
                <Gallery showFullGalleryLink={false} />
              </PageLayout>
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<VisitorDashboardPage />} />
          <Route path="/state-admin" element={<StateAdminDashboardPage />} />
          <Route path="/district-admin" element={<DistrictAdminDashboardPage />} />
          <Route path="/admin/login" element={<AdminDashboardPage />} />
          <Route path="/faq" element={<PlaceholderPage title="FAQs" description="Frequently asked questions about Smart Darshan and temple booking." />} />
          <Route path="/contact" element={<PlaceholderPage title="Contact Us" description="Get in touch with the Smart Darshan team." />} />
          <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" description="Smart Darshan privacy policy and data protection information." />} />
          <Route path="/terms" element={<PlaceholderPage title="Terms & Conditions" description="Terms and conditions for using Smart Darshan services." />} />
          <Route path="/disclaimer" element={<PlaceholderPage title="Disclaimer" description="Disclaimer for Smart Darshan platform content and services." />} />
          <Route path="*" element={<PlaceholderPage title="Page Not Found" description="The page you are looking for does not exist." />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
