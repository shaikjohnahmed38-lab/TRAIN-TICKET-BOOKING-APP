import { jsPDF } from 'jspdf';
import type { BookingRecord } from '../types/railway';

export function downloadDemoTicketPdf(
  booking: BookingRecord,
  appNamePlaceholder: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header strip
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(appNamePlaceholder || 'TRAINSYNK', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('ELECTRONIC RESERVATION SLIP (E-TICKET)', 14, 19);

  const isRazorpay = booking.paymentMethod === 'RAZORPAY';
  doc.setFillColor(isRazorpay ? 220 : 254, isRazorpay ? 252 : 243, isRazorpay ? 231 : 199);
  doc.rect(126, 6, 70, 12, 'F');
  doc.setTextColor(isRazorpay ? 22 : 146, isRazorpay ? 101 : 64, isRazorpay ? 52 : 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    isRazorpay ? 'GATEWAY VERIFIED RECEIPT' : 'LOCAL RESERVATION RECORD',
    161,
    13.5,
    { align: 'center' }
  );

  // Subtle watermark across ticket body
  doc.setTextColor(238, 242, 247);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.text(appNamePlaceholder || 'TRAINSYNK', 105, 165, {
    align: 'center',
    angle: 35,
  });

  // PNR and Status Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 34, 182, 24, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PNR NUMBER', 20, 42);
  doc.text('BOOKING STATUS', 92, 42);
  doc.text('BOOKING DATE', 148, 42);

  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.text(booking.pnr, 20, 51);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (booking.status === 'CONFIRMED') {
    doc.setTextColor(22, 163, 74);
  } else if (booking.status === 'CANCELLED' || booking.status === 'PAYMENT_FAILED') {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(202, 138, 4);
  }
  doc.text(booking.status, 92, 51);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const bookedDateStr = new Date(booking.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(bookedDateStr, 148, 51);

  // Train & Journey Summary
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 64, 182, 42, 2, 2, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TRAIN NUMBER & NAME', 20, 72);
  doc.text('JOURNEY DATE', 120, 72);
  doc.text('CLASS / COACH', 160, 72);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${booking.trainNumber} · ${booking.trainNameEn}`, 20, 79);
  doc.text(booking.journeyDate, 120, 79);
  doc.text(`${booking.coachType} · ${booking.coachCode}`, 160, 79);

  doc.setDrawColor(241, 245, 249);
  doc.line(20, 84, 190, 84);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.text('FROM STATION', 20, 91);
  doc.text('TO STATION', 112, 91);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${booking.fromNameEn} (${booking.fromCode})`, 20, 98);
  doc.text(`${booking.toNameEn} (${booking.toCode})`, 112, 98);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(29, 78, 216);
  doc.text(`Dep: ${booking.departureTime}`, 20, 103);
  doc.text(`Arr: ${booking.arrivalTime}`, 112, 103);

  // Passenger Details Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PASSENGER DETAILS', 14, 118);

  doc.setFillColor(241, 245, 249);
  doc.rect(14, 122, 182, 8, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('#', 18, 127.5);
  doc.text('PASSENGER NAME', 28, 127.5);
  doc.text('AGE / GENDER', 105, 127.5);
  doc.text('COACH / SEAT', 145, 127.5);
  doc.text('BERTH', 178, 127.5);

  let yPos = 136;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  booking.passengers.forEach((p, idx) => {
    doc.text(String(idx + 1), 18, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(p.fullName, 28, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${p.age} yrs / ${p.gender}`, 105, yPos);
    doc.setFont('courier', 'bold');
    doc.text(`${booking.coachCode} / ${p.seatNumber}`, 145, yPos);
    doc.text(p.berthType, 178, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, yPos + 3, 196, yPos + 3);
    yPos += 10;
  });

  // Payment & Fare Summary
  const fareBoxTop = Math.max(yPos + 6, 178);
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, fareBoxTop, 182, 26, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PAYMENT METHOD', 20, fareBoxTop + 8);
  doc.text('SEAT NUMBERS', 85, fareBoxTop + 8);
  doc.text('TOTAL FARE', 148, fareBoxTop + 8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.text(booking.paymentMethod ?? 'CHECKOUT', 20, fareBoxTop + 16);
  doc.setFont('courier', 'bold');
  doc.text(booking.seatNumbers.join(', '), 85, fareBoxTop + 16);
  doc.setTextColor(29, 78, 216);
  doc.setFontSize(12);
  doc.text(`INR ${booking.totalFare.toFixed(2)}`, 148, fareBoxTop + 16);

  // Footer Notice
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 252, 182, 24, 2, 2, 'FD');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`${appNamePlaceholder || 'TRAINSYNK'} RESERVATION RECORD`, 20, 260);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'This electronic reservation slip was generated from your persistent TRAINSYNK booking record.',
    20,
    266
  );
  doc.text(
    'External Indian Railways / IRCTC carrier validity requires authorized official railway API provisioning.',
    20,
    271
  );

  doc.save(`TRAINSYNK-Ticket-${booking.pnr}.pdf`);
}
