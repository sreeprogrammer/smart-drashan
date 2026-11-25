import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket, Loader2, Calendar, Clock, Church, Eye, X, IndianRupee,
  CheckCircle2, AlertCircle, Users, MapPin, RotateCw,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import OtpLoginModal from '@/components/OtpLoginModal';
import DigitalTicket from '@/components/DigitalTicket';
import { useAuth } from '@/lib/auth';
import { fetchUserBookings, cancelBookingById, formatTime, formatDate } from '@/lib/booking';
import { cancelLocalDemoBooking, getLocalDemoBookings } from '@/lib/localDemoBookings';
import { supabase, type BookingWithDetails, type BookingAuditLog } from '@/lib/supabase';

export default function MyTicketsPage() {
  const { user, isDemoMode, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [viewBooking, setViewBooking] = useState<BookingWithDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<BookingAuditLog[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = isDemoMode ? getLocalDemoBookings() : await fetchUserBookings();
      setBookings(data);
    } catch {
      setBookings([]);
    }
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    if (user) {
      loadBookings();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, loadBookings]);

  const handleViewTicket = async (booking: BookingWithDetails) => {
    setViewBooking(booking);
    const { data } = await supabase
      .from('booking_audit_logs')
      .select('*')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false });
    setAuditLogs((data || []) as BookingAuditLog[]);
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(bookingId);
    try {
      if (isDemoMode) {
        cancelLocalDemoBooking(bookingId);
      } else {
        await cancelBookingById(bookingId);
      }
      await loadBookings();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel booking');
    }
    setCancelling(null);
  };

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter((b) => b.booking_status === filter);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  if (authLoading || loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-maroon-deep animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <Ticket className="w-16 h-16 mx-auto text-navy-900/20 mb-4" />
          <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">My Tickets</h1>
          <p className="text-sm text-navy-900/60 mb-6">Please log in to view your bookings and tickets.</p>
          <button
            onClick={() => setShowLogin(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            <Ticket className="w-5 h-5" /> Login with OTP
          </button>
          <OtpLoginModal open={showLogin} onClose={() => setShowLogin(false)} onAuthenticated={() => loadBookings()} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <section className="relative h-[180px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/11539838/pexels-photo-11539838.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="My tickets"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">My Darshan Tickets</h1>
          <p className="text-sm text-cream/80 mt-1">View and manage your bookings</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'completed', label: 'Completed' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'bg-maroon-deep text-white'
                  : 'bg-white text-navy-900/60 border border-gold-200 hover:bg-cream'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gold-200">
            <Ticket className="w-12 h-12 mx-auto text-navy-900/20 mb-3" />
            <p className="text-sm text-navy-900/60 mb-4">No bookings found in this category.</p>
            <Link
              to="/tickets"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-maroon-deep to-maroon-800 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              <Ticket className="w-4 h-4" /> Book Darshan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm transition-all hover:shadow-md ${
                  booking.category_type === 'special' ? 'border-navy-200' : 'border-maroon-200'
                }`}
              >
                {/* Card header */}
                <div className={`px-4 py-3 ${
                  booking.category_type === 'special'
                    ? 'bg-gradient-to-r from-navy-900 to-navy-800'
                    : 'bg-gradient-to-r from-maroon-deep to-maroon-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gold-300 uppercase tracking-wide">
                      {booking.category_type === 'special' ? 'Special Darshan' : 'Local Darshan'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColors[booking.booking_status]}`}>
                      {booking.booking_status}
                    </span>
                  </div>
                  <p className="font-mono text-sm font-bold text-white mt-1">{booking.booking_ref}</p>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Church className="w-4 h-4 text-gold-600 flex-shrink-0" />
                    <span className="font-semibold text-navy-900">{booking.temple_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-navy-900/60">
                    <Calendar className="w-3.5 h-3.5 text-navy-900/40" />
                    {formatDate(booking.darshan_date)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-navy-900/60">
                    <Clock className="w-3.5 h-3.5 text-navy-900/40" />
                    {formatTime(booking.slot_start_time || '')} - {formatTime(booking.slot_end_time || '')}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-navy-900/60">
                    <Users className="w-3.5 h-3.5 text-navy-900/40" />
                    {booking.visitor_count} visitor(s) • {booking.visitor_name}
                  </div>
                  {booking.category_type === 'special' && (
                    <div className="flex items-center gap-2 text-xs text-navy-900/60">
                      <IndianRupee className="w-3.5 h-3.5 text-navy-900/40" />
                      ₹{booking.total_price} • {booking.payment_status}
                    </div>
                  )}

                  {/* Verification status */}
                  {booking.category_type === 'local' && booking.aadhaar_verification_status !== 'not_required' && (
                    <div className="flex items-center gap-1.5 text-xs pt-1">
                      {booking.aadhaar_verification_status === 'approved'
                        ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700">Aadhaar verified</span></>
                        : booking.aadhaar_verification_status === 'rejected'
                        ? <><AlertCircle className="w-3.5 h-3.5 text-red-600" /><span className="text-red-700">Aadhaar rejected</span></>
                        : <><Clock className="w-3.5 h-3.5 text-amber-600" /><span className="text-amber-700">Aadhaar pending verification</span></>
                      }
                    </div>
                  )}
                  {booking.category_type === 'special' && booking.residency_verification_status !== 'not_required' && (
                    <div className="flex items-center gap-1.5 text-xs pt-1">
                      {booking.residency_verification_status === 'approved'
                        ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700">Residency verified</span></>
                        : booking.residency_verification_status === 'rejected'
                        ? <><AlertCircle className="w-3.5 h-3.5 text-red-600" /><span className="text-red-700">Residency rejected</span></>
                        : <><Clock className="w-3.5 h-3.5 text-amber-600" /><span className="text-amber-700">Residency pending verification</span></>
                      }
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => handleViewTicket(booking)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-navy-900 text-white text-xs font-semibold rounded-lg hover:bg-navy-800 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Ticket
                  </button>
                  {(booking.booking_status === 'pending' || booking.booking_status === 'confirmed') && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancelling === booking.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {cancelling === booking.id ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket modal */}
      {viewBooking && (
        <div className="fixed inset-0 z-[150] bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="my-8 w-full max-w-2xl">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setViewBooking(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <DigitalTicket
              booking={viewBooking}
              districtName={viewBooking.district_name}
              onClose={() => setViewBooking(null)}
            />
            {/* Audit logs */}
            {auditLogs.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gold-200 p-5 mt-4">
                <h3 className="font-serif text-sm font-bold text-navy-900 mb-3">Verification History</h3>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold-accent mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-navy-900">{log.action.replace(/_/g, ' ')}</span>
                        <span className="text-navy-900/40 ml-2">{formatDate(log.created_at)}</span>
                        {log.remarks && <p className="text-navy-900/60 mt-0.5">{log.remarks}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
