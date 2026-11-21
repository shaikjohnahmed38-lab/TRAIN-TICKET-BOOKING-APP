import React from 'react';
import { CheckCircle2, Clock, Download, Search, Ticket } from 'lucide-react';
import { downloadDemoTicketPdf } from '../utils/pdfTicket';
import type { BookingRecord, Language } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface ConfirmationScreenProps {
  booking: BookingRecord;
  appName: string;
  onGoToBookings: () => void;
  onBookAnother: () => void;
  language: Language;
  t: TranslationDictionary;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  booking,
  appName,
  onGoToBookings,
  onBookAnother,
  language,
  t,
}) => {
  const isConfirmed = booking.status === 'CONFIRMED';
  const isPending = booking.status === 'PAYMENT_PENDING';

  const heading = isConfirmed
    ? t.confirmation.confirmedTitle
    : isPending
    ? t.confirmation.pendingTitle
    : t.confirmation.wlTitle;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-12 space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isConfirmed
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              {isConfirmed ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{heading}</h1>
              <p className="text-xs font-bold text-red-700 mt-1">
                {t.confirmation.notValidTravel}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-500">{t.common.pnr}</div>
            <div
              data-testid="confirmed-pnr"
              className="font-mono-tabular text-2xl font-bold text-blue-700"
            >
              {booking.pnr}
            </div>
          </div>
        </div>

        {/* Journey Details */}
        <div className="grid sm:grid-cols-2 gap-4 text-sm bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div>
            <div className="text-xs text-slate-500">Train</div>
            <div className="font-bold text-slate-900">
              #{booking.trainNumber} ·{' '}
              {language === 'te' ? booking.trainNameTe : booking.trainNameEn}
            </div>
            <div className="text-xs font-mono-tabular text-slate-600 mt-1">
              {booking.fromNameEn} ({booking.fromCode}) {booking.departureTime} →{' '}
              {booking.toNameEn} ({booking.toCode}) {booking.arrivalTime}
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-slate-500">
              {t.common.coach} &amp; {t.common.seats}
            </div>
            <div className="font-mono-tabular font-bold text-slate-900">
              {booking.coachCode} ({booking.coachType}) · {booking.seatNumbers.join(', ')}
            </div>
            <div className="text-xs font-mono-tabular text-slate-600 mt-1">
              {booking.journeyDate} · {t.common.status}: {booking.status}
            </div>
          </div>
        </div>

        {/* Passengers */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">{t.common.passengers}</h2>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {booking.passengers.map((p, idx) => (
              <div
                key={p.seatNumber}
                className="px-4 py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-semibold text-slate-900">
                    {idx + 1}. {p.fullName}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({p.age} yrs · {p.gender})
                  </span>
                </div>
                <span className="font-mono-tabular text-xs font-bold text-blue-700">
                  {booking.coachCode}-{p.seatNumber} ({p.berthType})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm font-semibold text-slate-600">
            {t.trainMap.totalDemoFare} ({booking.paymentMethod ?? 'DEMO'})
          </span>
          <span className="font-mono-tabular text-2xl font-bold text-slate-900">
            ₹{booking.totalFare}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => downloadDemoTicketPdf(booking, appName)}
            data-testid="download-pdf-btn"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t.confirmation.downloadPdfBtn}</span>
          </button>

          <button
            type="button"
            onClick={onGoToBookings}
            className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors"
          >
            <Ticket className="w-4 h-4" />
            <span>{t.confirmation.viewMyBookingsBtn}</span>
          </button>

          <button
            type="button"
            onClick={onBookAnother}
            className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>{t.confirmation.bookAnotherBtn}</span>
          </button>
        </div>
      </section>
    </main>
  );
};
