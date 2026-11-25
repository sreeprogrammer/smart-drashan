import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Loader2, CheckCircle2, XCircle, Clock, Eye, Church, Phone,
  Calendar, Users, FileText, Filter, ChevronDown, QrCode, X,
  AlertCircle, MapPin, IndianRupee, ScanLine, Newspaper, UserCheck, CalendarClock, Settings,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import AdminCredentialLogin from '@/components/AdminCredentialLogin';
import DigitalTicket from '@/components/DigitalTicket';
import { useAuth } from '@/lib/auth';
import {
  fetchAllBookingsForAdmin, adminApprove, adminReject, validateTicketById,
  fetchAuditLogs, formatTime, formatDate,
} from '@/lib/booking';
import { supabase, type BookingWithDetails, type BookingAuditLog, type TempleAdmin } from '@/lib/supabase';
import {
  findLocalDemoBookingByReference,
  getDaywiseCrowdForecast,
  getLocalDemoBookings,
  updateLocalDemoBooking,
} from '@/lib/localDemoBookings';

type TabKey = 'pending' | 'local' | 'senior' | 'special' | 'approved' | 'rejected';

function getLocalDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function csvCell(value: string | number) {
  const text = String(value);
  const safeText = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadDailyBookings(bookings: BookingWithDetails[], date: string) {
  const columns = [
    'Booking Reference',
    'Visitor Name',
    'Mobile',
    'Temple',
    'District',
    'Darshan Date',
    'Start Time',
    'End Time',
    'Category',
    'Visitor Count',
    'Booking Status',
    'Payment Status',
    'Total Price (INR)',
  ];
  const rows = bookings.map((booking) => [
    booking.booking_ref,
    booking.visitor_name,
    booking.visitor_mobile,
    booking.temple_name ?? '',
    booking.district_name ?? '',
    booking.darshan_date,
    booking.slot_start_time ? formatTime(booking.slot_start_time) : '',
    booking.slot_end_time ? formatTime(booking.slot_end_time) : '',
    booking.category_type === 'special' ? 'Special Darshan' : booking.is_senior ? 'Local Darshan (Senior)' : 'Local Darshan',
    booking.visitor_count,
    booking.booking_status,
    booking.payment_status,
    booking.total_price,
  ]);
  const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `smart-darshan-bookings-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'local', label: 'Local Darshan', icon: Church },
  { key: 'senior', label: 'Senior Citizen', icon: Users },
  { key: 'special', label: 'Special Darshan', icon: IndianRupee },
  { key: 'approved', label: 'Approved', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
];

export default function AdminDashboardPage() {
  const { user, isAdmin, isDemoMode, loading: authLoading, refreshAdmin } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(isDemoMode ? 'special' : 'pending');
  const [viewBooking, setViewBooking] = useState<BookingWithDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<BookingAuditLog[]>([]);
  const [remarks, setRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showValidate, setShowValidate] = useState(false);
  const [validateInput, setValidateInput] = useState('');
  const [validateResult, setValidateResult] = useState<{ is_valid: boolean; message: string } | null>(null);
  const [validateLoading, setValidateLoading] = useState(false);
  const [exportDate, setExportDate] = useState(getLocalDateInputValue);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = isDemoMode ? getLocalDemoBookings() : await fetchAllBookingsForAdmin();
      setBookings(data);
    } catch {
      setBookings([]);
    }
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    if (isAdmin) {
      loadBookings();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAdmin, authLoading, loadBookings]);

  useEffect(() => {
    if (isDemoMode) setActiveTab('special');
  }, [isDemoMode]);

  const handleView = async (booking: BookingWithDetails) => {
    setViewBooking(booking);
    setRemarks('');
    setRejectReason('');
    setShowReject(false);
    setActionError(null);
    if (isDemoMode) {
      setAuditLogs([]);
      return;
    }
    const logs = await fetchAuditLogs(booking.id);
    setAuditLogs(logs as BookingAuditLog[]);
  };

  const handleApprove = async () => {
    if (!viewBooking) return;
    setActionLoading(true);
    setActionError(null);
    if (isDemoMode) {
      try {
        updateLocalDemoBooking(viewBooking.id, 'confirmed', remarks.trim());
        await loadBookings();
        setViewBooking(null);
      } catch {
        setActionError('The local demo booking could not be approved.');
      }
      setActionLoading(false);
      return;
    }
    try {
      const result = await adminApprove(viewBooking.id, remarks);
      if (result.success) {
        await loadBookings();
        await refreshAdmin();
        setViewBooking(null);
      } else {
        setActionError(result.error || 'Approval failed');
      }
    } catch {
      setActionError('Failed to approve booking');
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!viewBooking || !rejectReason.trim()) return;
    setActionLoading(true);
    setActionError(null);
    if (isDemoMode) {
      try {
        updateLocalDemoBooking(viewBooking.id, 'rejected', rejectReason.trim());
        await loadBookings();
        setViewBooking(null);
      } catch {
        setActionError('The local demo booking could not be rejected.');
      }
      setActionLoading(false);
      return;
    }
    try {
      const result = await adminReject(viewBooking.id, rejectReason);
      if (result.success) {
        await loadBookings();
        setViewBooking(null);
      } else {
        setActionError(result.error || 'Rejection failed');
      }
    } catch {
      setActionError('Failed to reject booking');
    }
    setActionLoading(false);
  };

  const handleValidateTicket = async () => {
    setValidateLoading(true);
    setValidateResult(null);
    if (isDemoMode) {
      try {
        const booking = findLocalDemoBookingByReference(validateInput);
        if (!booking) {
          setValidateResult({ is_valid: false, message: 'Demo booking reference not found.' });
        } else if (booking.booking_status !== 'confirmed') {
          setValidateResult({ is_valid: false, message: `Booking is ${booking.booking_status}; only confirmed tickets can be validated.` });
        } else {
          updateLocalDemoBooking(booking.id, 'completed', 'Ticket validated in local demo mode.');
          setValidateResult({ is_valid: true, message: 'Demo ticket validated. No live booking data was changed.' });
          await loadBookings();
        }
      } catch {
        setValidateResult({ is_valid: false, message: 'Local demo ticket validation failed.' });
      }
      setValidateLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_ref, booking_status, visitor_name, temple_name')
        .eq('booking_ref', validateInput.trim())
        .maybeSingle();
      if (!data) {
        setValidateResult({ is_valid: false, message: 'Booking reference not found' });
      } else {
        const result = await validateTicketById((data as { id: string }).id);
        setValidateResult({
          is_valid: result.is_valid || false,
          message: result.message || result.error || 'Validation failed',
        });
        if (result.success) await loadBookings();
      }
    } catch {
      setValidateResult({ is_valid: false, message: 'Validation error' });
    }
    setValidateLoading(false);
  };

  const filteredBookings = (() => {
    switch (activeTab) {
      case 'pending': return bookings.filter((b) => b.booking_status === 'pending');
      case 'local': return bookings.filter((b) => b.category_type === 'local' && !b.is_senior);
      case 'senior': return bookings.filter((b) => b.category_type === 'local' && b.is_senior);
      case 'special': return bookings.filter((b) => b.category_type === 'special');
      case 'approved': return bookings.filter((b) => b.booking_status === 'confirmed' || b.booking_status === 'completed');
      case 'rejected': return bookings.filter((b) => b.booking_status === 'rejected');
      default: return bookings;
    }
  })();

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      confirmed: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
      completed: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-500';
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
          <Shield className="w-16 h-16 mx-auto text-navy-900/20 mb-4" />
          <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Admin Dashboard</h1>
          <p className="text-sm text-navy-900/60 mb-6">Sign in with your admin credentials to access the verification dashboard.</p>
          <AdminCredentialLogin onAuthenticated={refreshAdmin} />
        </div>
      </PageLayout>
    );
  }

  if (!isAdmin) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Access Denied</h1>
          <p className="text-sm text-navy-900/60 mb-4">
            {isDemoMode
              ? 'Visitor demo OTP does not open the admin dashboard. Sign in with the local admin demo credentials.'
              : 'This account does not have admin privileges. Sign in with an assigned administrator account to continue.'}
          </p>
          {!isDemoMode && <p className="text-xs text-navy-900/40">User ID: {user.id}</p>}
          <AdminCredentialLogin onAuthenticated={refreshAdmin} />
        </div>
      </PageLayout>
    );
  }

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.booking_status === 'pending').length,
    confirmed: bookings.filter((b) => b.booking_status === 'confirmed').length,
    rejected: bookings.filter((b) => b.booking_status === 'rejected').length,
    completed: bookings.filter((b) => b.booking_status === 'completed').length,
  };
  const dailyBookings = bookings.filter((booking) => booking.darshan_date === exportDate);
  const dailyVisitorCount = dailyBookings.reduce((total, booking) => total + booking.visitor_count, 0);
  const crowdForecast = getDaywiseCrowdForecast(bookings);

  return (
    <PageLayout>
      <section className="bg-gradient-to-r from-navy-900 to-maroon-deep px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-accent/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gold-300" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold text-white">
                  {isDemoMode ? 'Local Demo Admin Dashboard' : 'Temple Admin Dashboard'}
                </h1>
                <p className="text-xs text-cream/60">
                  {isDemoMode ? 'Special-entry approvals and sample crowd outlook' : 'Verification & approval portal'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isDemoMode && <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1.5 text-xs font-semibold text-amber-100">LOCAL DEMO · changes stay in this browser</span>}
              {!isDemoMode && <Link
                to="/admin/senior-verifications"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                <UserCheck className="w-4 h-4" /> Senior Applications
              </Link>}
              {!isDemoMode && <Link
                to="/admin/slots"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                <CalendarClock className="w-4 h-4" /> Slots
              </Link>}
              {!isDemoMode && <Link
                to="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                <Settings className="w-4 h-4" /> Settings
              </Link>}
              {!isDemoMode && <Link
                to="/admin/news"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                <Newspaper className="w-4 h-4" /> News & Events
              </Link>}
              <button
                onClick={() => setShowValidate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gold-accent/20 text-gold-300 text-sm font-semibold rounded-lg hover:bg-gold-accent/30 transition-all border border-gold-accent/30"
              >
                <ScanLine className="w-4 h-4" /> Validate QR Ticket
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'Pending', value: stats.pending, color: 'text-amber-300' },
              { label: 'Confirmed', value: stats.confirmed, color: 'text-green-300' },
              { label: 'Rejected', value: stats.rejected, color: 'text-red-300' },
              { label: 'Completed', value: stats.completed, color: 'text-blue-300' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-gold-accent/10">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-cream/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="flex flex-col gap-4 rounded-xl border border-gold-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-navy-900">Daily booking tickets</h2>
            <p className="mt-1 text-xs text-navy-900/60">
              {dailyBookings.length} booking(s) · {dailyVisitorCount} visitor(s) for the selected darshan date
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-xs font-semibold text-navy-900/70">
              Darshan date
              <input
                type="date"
                value={exportDate}
                onChange={(event) => setExportDate(event.target.value)}
                className="mt-1 block rounded-lg border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </label>
            <button
              type="button"
              onClick={() => downloadDailyBookings(dailyBookings, exportDate)}
              disabled={dailyBookings.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-maroon-deep px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-maroon-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download Excel-compatible CSV
            </button>
          </div>
        </div>
      </section>

      {isDemoMode && (
        <section className="mx-auto max-w-7xl px-4 pt-6">
          <div className="rounded-xl border border-gold-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-bold text-navy-900">Day-wise crowd prediction</h2>
                <p className="mt-1 text-xs text-navy-900/60">Demo estimate from pending and confirmed bookings; not live sensor data.</p>
              </div>
              <span className="text-xs text-navy-900/50">Next 7 days</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {crowdForecast.map((day) => {
                const levelClass = day.crowdLevel === 'Very high'
                  ? 'text-red-700 bg-red-50'
                  : day.crowdLevel === 'High'
                    ? 'text-orange-700 bg-orange-50'
                    : day.crowdLevel === 'Moderate'
                      ? 'text-amber-700 bg-amber-50'
                      : 'text-emerald-700 bg-emerald-50';
                return (
                  <div key={day.date} className="rounded-lg border border-navy-100 bg-cream/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-navy-900">{day.label}</p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${levelClass}`}>{day.crowdLevel}</span>
                    </div>
                    <p className="mt-2 text-xs text-navy-900/65">{day.visitors} expected visitors · {day.bookingCount} bookings</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" style={{ width: `${day.barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-maroon-deep text-white shadow-md'
                    : 'bg-white text-navy-900/60 border border-gold-200 hover:bg-cream'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Bookings table */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gold-200">
            <FileText className="w-12 h-12 mx-auto text-navy-900/20 mb-3" />
            <p className="text-sm text-navy-900/60">No applications in this category.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gold-200 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream/50 border-b border-gold-200">
                  <tr className="text-left text-xs font-semibold text-navy-900/50 uppercase tracking-wide">
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Temple</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Date / Slot</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-50">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-cream/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-bold text-navy-900">{b.booking_ref}</p>
                        <p className="text-[10px] text-navy-900/40">{formatDate(b.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-navy-900">{b.visitor_name}</p>
                        <p className="text-xs text-navy-900/50 flex items-center gap-1"><Phone className="w-3 h-3" />{b.visitor_mobile}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-navy-900">{b.temple_name}</p>
                        {b.district_name && <p className="text-xs text-navy-900/50">{b.district_name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          b.category_type === 'special' ? 'bg-navy-50 text-navy-700' : 'bg-maroon-50 text-maroon-700'
                        }`}>
                          {b.category_type === 'special' ? 'Special' : 'Local'}
                          {b.is_senior && ' (Senior)'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-navy-900/70">{formatDate(b.darshan_date)}</p>
                        <p className="text-xs text-navy-900/50">{formatTime(b.slot_start_time || '')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadge(b.booking_status)}`}>
                          {b.booking_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleView(b)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-navy-900 text-white text-xs font-semibold rounded-lg hover:bg-navy-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gold-50">
              {filteredBookings.map((b) => (
                <div key={b.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-mono text-xs font-bold text-navy-900">{b.booking_ref}</p>
                      <p className="font-medium text-navy-900 text-sm mt-0.5">{b.visitor_name}</p>
                      <p className="text-xs text-navy-900/50">{b.visitor_mobile}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadge(b.booking_status)}`}>
                      {b.booking_status}
                    </span>
                  </div>
                  <p className="text-xs text-navy-900/70 mb-1">{b.temple_name}</p>
                  <p className="text-xs text-navy-900/50 mb-3">{formatDate(b.darshan_date)} • {formatTime(b.slot_start_time || '')}</p>
                  <button
                    onClick={() => handleView(b)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-navy-900 text-white text-xs font-semibold rounded-lg"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review Application
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review modal */}
      {viewBooking && (
        <div className="fixed inset-0 z-[150] bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="my-4 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className={`px-5 py-4 flex items-center justify-between ${
              viewBooking.category_type === 'special' ? 'bg-gradient-to-r from-navy-900 to-navy-800' : 'bg-gradient-to-r from-maroon-deep to-maroon-800'
            }`}>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Application Review</h3>
                <p className="font-mono text-xs text-gold-300 mt-0.5">{viewBooking.booking_ref}</p>
              </div>
              <button onClick={() => setViewBooking(null)} className="text-cream/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {isDemoMode && viewBooking.category_type === 'special' && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Demo approval only: accepting this request updates local sample data and simulates payment; no payment is processed.
                </p>
              )}
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {actionError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Applicant</p>
                  <p className="text-navy-900 font-medium">{viewBooking.visitor_name}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Mobile</p>
                  <p className="text-navy-900">{viewBooking.visitor_mobile}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Temple</p>
                  <p className="text-navy-900">{viewBooking.temple_name}</p>
                  {viewBooking.district_name && <p className="text-xs text-navy-900/50">{viewBooking.district_name}</p>}
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Category</p>
                  <p className="text-navy-900 capitalize">{viewBooking.category_type} {viewBooking.is_senior && '(Senior)'}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Darshan Date</p>
                  <p className="text-navy-900">{formatDate(viewBooking.darshan_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Time Slot</p>
                  <p className="text-navy-900">{formatTime(viewBooking.slot_start_time || '')} - {formatTime(viewBooking.slot_end_time || '')}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Visitors</p>
                  <p className="text-navy-900">{viewBooking.visitor_count}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Date of Birth</p>
                  <p className="text-navy-900">{viewBooking.date_of_birth ? formatDate(viewBooking.date_of_birth) : 'N/A'}</p>
                </div>
                {viewBooking.aadhaar_masked && (
                  <div>
                    <p className="text-xs text-navy-900/40 uppercase font-semibold">Aadhaar (masked)</p>
                    <p className="text-navy-900 font-mono">{viewBooking.aadhaar_masked}</p>
                  </div>
                )}
                {viewBooking.category_type === 'special' && (
                  <>
                    <div>
                      <p className="text-xs text-navy-900/40 uppercase font-semibold">Price</p>
                      <p className="text-navy-900">₹{viewBooking.total_price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-navy-900/40 uppercase font-semibold">Payment</p>
                      <p className="text-navy-900 capitalize">{viewBooking.payment_status}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Aadhaar Status</p>
                  <p className={`font-semibold capitalize ${
                    viewBooking.aadhaar_verification_status === 'approved' ? 'text-green-600' :
                    viewBooking.aadhaar_verification_status === 'rejected' ? 'text-red-600' :
                    viewBooking.aadhaar_verification_status === 'pending' ? 'text-amber-600' : 'text-navy-900/40'
                  }`}>{viewBooking.aadhaar_verification_status.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Residency Status</p>
                  <p className={`font-semibold capitalize ${
                    viewBooking.residency_verification_status === 'approved' ? 'text-green-600' :
                    viewBooking.residency_verification_status === 'rejected' ? 'text-red-600' :
                    viewBooking.residency_verification_status === 'pending' ? 'text-amber-600' : 'text-navy-900/40'
                  }`}>{viewBooking.residency_verification_status.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Submitted</p>
                  <p className="text-navy-900 text-xs">{formatDate(viewBooking.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-900/40 uppercase font-semibold">Booking Status</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadge(viewBooking.booking_status)}`}>
                    {viewBooking.booking_status}
                  </span>
                </div>
              </div>

              {/* Audit logs */}
              {auditLogs.length > 0 && (
                <div className="bg-cream/50 rounded-lg p-3 border border-gold-100">
                  <p className="text-xs font-semibold text-navy-900/50 uppercase mb-2">Verification History</p>
                  <div className="space-y-1.5">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold-accent mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-navy-900">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-navy-900/40 ml-2">{formatDate(log.created_at)}</span>
                          {log.remarks && <p className="text-navy-900/60">{log.remarks}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approve section */}
              {viewBooking.booking_status === 'pending' && (
                <div className="border-t border-gold-100 pt-4 space-y-3">
                  {!showReject ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-1.5">Verification Remarks</label>
                        <textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-navy-900/15 rounded-lg outline-none focus:border-gold-accent transition-colors resize-none"
                          placeholder="Add verification remarks (optional for approval, required for rejection)..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleApprove}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setShowReject(true)}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-1.5">Rejection Reason *</label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-navy-900/15 rounded-lg outline-none focus:border-gold-accent transition-colors resize-none"
                          placeholder="Provide a reason for rejection..."
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => setShowReject(false)}
                          className="px-4 py-2.5 text-sm font-medium text-navy-900/60 border border-navy-900/15 rounded-lg hover:bg-cream"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* View ticket button for confirmed/completed */}
              {(viewBooking.booking_status === 'confirmed' || viewBooking.booking_status === 'completed') && (
                <div className="border-t border-gold-100 pt-4">
                  <DigitalTicket booking={viewBooking} districtName={viewBooking.district_name} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Validate modal */}
      {showValidate && (
        <div className="fixed inset-0 z-[150] bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-navy-900 to-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-gold-300" />
                <h3 className="font-serif text-lg font-bold text-white">Validate Ticket</h3>
              </div>
              <button onClick={() => { setShowValidate(false); setValidateResult(null); setValidateInput(''); }} className="text-cream/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Enter Booking Reference</label>
                <input
                  type="text"
                  value={validateInput}
                  onChange={(e) => setValidateInput(e.target.value.toUpperCase())}
                  placeholder="SD-LOCAL-100001 or SD-SPECIAL-100002"
                  className="w-full px-3 py-2.5 text-sm font-mono border border-navy-900/15 rounded-lg outline-none focus:border-gold-accent transition-colors"
                />
                <p className="text-xs text-navy-900/40 mt-1">Enter the booking reference shown on the ticket QR code</p>
              </div>
              <button
                onClick={handleValidateTicket}
                disabled={validateLoading || !validateInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-navy-900 to-navy-800 text-white text-sm font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {validateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                {validateLoading ? 'Validating...' : 'Validate Ticket'}
              </button>

              {validateResult && (
                <div className={`rounded-lg p-4 border ${
                  validateResult.is_valid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {validateResult.is_valid
                      ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                      : <XCircle className="w-6 h-6 text-red-600" />
                    }
                    <div>
                      <p className={`font-semibold text-sm ${validateResult.is_valid ? 'text-green-800' : 'text-red-800'}`}>
                        {validateResult.is_valid ? 'Valid Ticket' : 'Invalid Ticket'}
                      </p>
                      <p className={`text-xs ${validateResult.is_valid ? 'text-green-700' : 'text-red-700'}`}>
                        {validateResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
