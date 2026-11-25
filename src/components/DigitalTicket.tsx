import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Church, Download, Printer, QrCode, MapPin, Calendar, Clock, Users, IndianRupee, ShieldCheck, X } from 'lucide-react';
import type { BookingWithDetails } from '@/lib/supabase';
import { formatTime, formatDate } from '@/lib/booking';

interface DigitalTicketProps {
  booking: BookingWithDetails;
  districtName?: string;
  onClose?: () => void;
}

export default function DigitalTicket({ booking, districtName, onClose }: DigitalTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpecial = booking.category_type === 'special';

  useEffect(() => {
    if (canvasRef.current) {
      const payload = JSON.stringify({
        ref: booking.booking_ref,
        temple: booking.temple_name,
        date: booking.darshan_date,
        slot: `${booking.slot_start_time}-${booking.slot_end_time}`,
        category: booking.category_type,
        visitors: booking.visitor_count,
      });
      QRCode.toCanvas(canvasRef.current, payload, {
        width: 160,
        margin: 1,
        color: { dark: isSpecial ? '#172554' : '#741B1B', light: '#ffffff' },
      }).catch(() => {});
    }
  }, [booking, isSpecial]);

  const handleDownloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [120, 80] });
    const accent = isSpecial ? '#172554' : '#741B1B';
    const accentLight = isSpecial ? '#1e3a8a' : '#9d1d3e';

    // Background
    pdf.setFillColor(255, 248, 231);
    pdf.rect(0, 0, 120, 80, 'F');

    // Top bar
    pdf.setFillColor(parseInt(accent.slice(1, 3), 16), parseInt(accent.slice(3, 5), 16), parseInt(accent.slice(5, 7), 16));
    pdf.rect(0, 0, 120, 14, 'F');

    pdf.setTextColor(212, 175, 55);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SMART DARSHAN', 5, 9);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(isSpecial ? 'SPECIAL DARSHAN' : 'LOCAL DARSHAN', 95, 9);

    // Content
    pdf.setTextColor(10, 21, 53);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(booking.temple_name || 'Temple', 5, 22);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text(districtName || '', 5, 26);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Ref: ${booking.booking_ref}`, 5, 33);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    const details = [
      `Visitor: ${booking.visitor_name}`,
      `Mobile: ${booking.visitor_mobile}`,
      `Date: ${formatDate(booking.darshan_date)}`,
      `Slot: ${formatTime(booking.slot_start_time || '')} - ${formatTime(booking.slot_end_time || '')}`,
      `Visitors: ${booking.visitor_count}`,
    ];
    details.forEach((line, i) => pdf.text(line, 5, 38 + i * 4));

    if (isSpecial) {
      pdf.text(`Price: Rs.${booking.total_price}`, 5, 58);
      pdf.text(`Payment: ${booking.payment_status}`, 5, 62);
    }

    pdf.text(`Status: ${booking.booking_status}`, 5, 66);

    // QR Code
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 85, 30, 28, 28);
    pdf.setFontSize(5);
    pdf.text('Scan to validate', 88, 61);

    // Bottom bar
    pdf.setFillColor(parseInt(accentLight.slice(1, 3), 16), parseInt(accentLight.slice(3, 5), 16), parseInt(accentLight.slice(5, 7), 16));
    pdf.rect(0, 76, 120, 4, 'F');

    pdf.save(`${booking.booking_ref}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const accentBg = isSpecial
    ? 'from-navy-900 to-navy-800'
    : 'from-maroon-deep to-maroon-800';
  const accentText = isSpecial ? 'text-gold-300' : 'text-gold-300';
  const borderColor = isSpecial ? 'border-navy-700' : 'border-maroon-700';

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto print:shadow-none print:rounded-none">
      {/* Top accent bar */}
      <div className={`bg-gradient-to-r ${accentBg} px-5 py-3 flex items-center justify-between print:hidden`}>
        <div className="flex items-center gap-2">
          <Church className={`w-5 h-5 ${accentText}`} />
          <span className="font-serif text-sm font-bold text-white">Digital Darshan Ticket</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-cream/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Ticket body */}
      <div className={`border-2 ${borderColor} border-t-0 rounded-b-2xl overflow-hidden print:border-2 print:rounded-lg`}>
        {/* Header section */}
        <div className={`bg-gradient-to-r ${accentBg} px-6 py-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold-accent/20 flex items-center justify-center flex-shrink-0">
              <Church className="w-6 h-6 text-gold-300" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">{booking.temple_name}</h3>
              <p className="text-xs text-cream/70">{districtName} District</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              isSpecial ? 'bg-gold-accent/20 text-gold-300' : 'bg-gold-accent/20 text-gold-300'
            }`}>
              {isSpecial ? 'SPECIAL DARSHAN' : 'LOCAL DARSHAN'}
            </span>
          </div>
        </div>

        {/* Ticket content */}
        <div className="flex flex-col sm:flex-row">
          {/* Details */}
          <div className="flex-1 px-6 py-5 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold">Booking ID</p>
                <p className="font-mono font-bold text-navy-900">{booking.booking_ref}</p>
              </div>
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold">Status</p>
                <p className={`font-bold capitalize ${
                  booking.booking_status === 'confirmed' ? 'text-green-600' :
                  booking.booking_status === 'pending' ? 'text-amber-600' :
                  booking.booking_status === 'rejected' ? 'text-red-600' :
                  booking.booking_status === 'completed' ? 'text-blue-600' :
                  'text-navy-900/60'
                }`}>{booking.booking_status}</p>
              </div>
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold">Visitor Name</p>
                <p className="text-navy-900 font-medium">{booking.visitor_name}</p>
              </div>
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold">Mobile</p>
                <p className="text-navy-900 font-medium">{booking.visitor_mobile}</p>
              </div>
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> Darshan Date</p>
                <p className="text-navy-900 font-medium">{formatDate(booking.darshan_date)}</p>
              </div>
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold">Booked On</p>
                <p className="text-navy-900 font-medium">{formatDate(booking.created_at.split('T')[0])}</p>
              </div>
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Time Slot</p>
                <p className="text-navy-900 font-medium">
                  {formatTime(booking.slot_start_time || '')} - {formatTime(booking.slot_end_time || '')}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold flex items-center gap-1"><Users className="w-3 h-3" /> Visitors</p>
                <p className="text-navy-900 font-medium">{booking.visitor_count}</p>
              </div>
              {isSpecial && (
                <div>
                  <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Price</p>
                  <p className="text-navy-900 font-medium">₹{booking.total_price}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold">Payment</p>
                <p className="font-medium capitalize text-navy-900">{booking.payment_status.replace(/_/g, ' ')}</p>
              </div>
              {booking.is_senior && (
                <div>
                  <p className="text-xs text-navy-900/40 uppercase tracking-wide font-semibold">Category</p>
                  <p className="font-medium text-maroon-deep">Senior Citizen</p>
                </div>
              )}
            </div>

            {/* Verification badges */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gold-100">
              {booking.category_type === 'local' && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  booking.aadhaar_verification_status === 'approved' ? 'bg-green-50 text-green-700' :
                  booking.aadhaar_verification_status === 'pending' ? 'bg-amber-50 text-amber-700' :
                  booking.aadhaar_verification_status === 'rejected' ? 'bg-red-50 text-red-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  Aadhaar: {booking.aadhaar_verification_status}
                </span>
              )}
              {booking.category_type === 'special' && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  booking.residency_verification_status === 'approved' ? 'bg-green-50 text-green-700' :
                  booking.residency_verification_status === 'pending' ? 'bg-amber-50 text-amber-700' :
                  booking.residency_verification_status === 'rejected' ? 'bg-red-50 text-red-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  <MapPin className="w-3 h-3" />
                  TN Residency: {booking.residency_verification_status}
                </span>
              )}
            </div>
          </div>

          {/* QR Code section */}
          <div className={`px-6 py-5 border-t sm:border-t-0 sm:border-l border-gold-100 flex flex-col items-center justify-center bg-cream/50`}>
            <canvas ref={canvasRef} className="rounded-lg" />
            <p className="text-xs text-navy-900/40 mt-2 text-center">Scan at temple entry</p>
            <p className="text-[10px] text-navy-900/30 mt-1 font-mono">{booking.booking_ref}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-cream/30 border-t border-gold-100 flex flex-wrap gap-2 print:hidden">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-maroon-deep text-white text-xs font-semibold rounded-lg hover:bg-maroon-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-navy-900/20 text-navy-900 text-xs font-semibold rounded-lg hover:bg-navy-900 hover:text-white transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          {booking.booking_status === 'confirmed' && (
            <span className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-xs font-semibold rounded-lg">
              <QrCode className="w-3.5 h-3.5" />
              Ready for validation
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
