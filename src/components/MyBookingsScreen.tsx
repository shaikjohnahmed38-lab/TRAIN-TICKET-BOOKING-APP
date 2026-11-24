import React, { useState } from 'react';
import { Download, RefreshCw, Search, Ticket, XCircle } from 'lucide-react';
import { downloadDemoTicketPdf } from '../utils/pdfTicket';
import type { BookingRecord, Language } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface MyBookingsScreenProps {
  bookings: BookingRecord[];
  appName: string;
  onCancelBooking: (pnr: string) => Promise<void>;
  onAdvanceRefund: (pnr: string) => Promise<void>;
  onGoSearch: () => void;
  language: Language;
  t: TranslationDictionary;
}

const PAGE_SIZE = 10;

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
  bookings,
  appName,
  onCancelBooking,
  onAdvanceRefund,
  onGoSearch,
  language,
  t,
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [busyPnr, setBusyPnr] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = bookings.filter((b) => {
    const matchesTab =
      activeTab === 'cancelled'
        ? b.status === 'CANCELLED' || b.status === 'PAYMENT_FAILED'
        : activeTab === 'completed'
        ? b.status !== 'CANCELLED' && b.status !== 'PAYMENT_FAILED' && b.journeyDate < todayStr
        : b.status !== 'CANCELLED' && b.status !== 'PAYMENT_FAILED' && b.journeyDate >= todayStr;

    if (!matchesTab) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      b.pnr.toLowerCase().includes(q) ||
      b.trainNumber.toLowerCase().includes(q) ||
      b.trainNameEn.toLowerCase().includes(q) ||
      b.fromCode.toLowerCase().includes(q) ||
      b.toCode.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.myBookings.title}</h1>
          <p className="text-sm text-slate-600 mt-0.5">{t.myBookings.subtitle}</p>
        </div>

        {/* Segmented Filter Tabs */}
        <div
          role="tablist"
          aria-label="Booking categories"
          className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start"
        >
          {(
            [
              { id: 'upcoming', label: t.myBookings.tabUpcoming },
              { id: 'completed', label: t.myBookings.tabCompleted },
              { id: 'cancelled', label: t.myBookings.tabCancelled },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t.myBookings.searchPlaceholder}
          aria-label={t.myBookings.searchPlaceholder}
          className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {actionError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {actionError}
        </div>
      )}

      {/* Bookings List */}
      {paged.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t.myBookings.emptyTitle}</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">{t.myBookings.emptyDesc}</p>
          <button
            type="button"
            onClick={onGoSearch}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
          >
            {t.nav.searchTrains}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paged.map((booking) => {
            const isCancelled = booking.status === 'CANCELLED';
            const canCancel =
              booking.status === 'CONFIRMED' ||
              booking.status === 'WL' ||
              booking.status === 'RAC' ||
              booking.status === 'PAYMENT_PENDING';

            return (
              <article
                key={booking.pnr}
                data-testid={`booking-card-${booking.pnr}`}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono-tabular font-bold text-blue-700">
                        PNR: {booking.pnr}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-bold text-slate-900">
                        #{booking.trainNumber}{' '}
                        {language === 'te' ? booking.trainNameTe : booking.trainNameEn}
                      </span>
                    </div>
                    <p className="text-xs font-mono-tabular text-slate-600 mt-1">
                      {booking.fromNameEn} ({booking.fromCode}) {booking.departureTime} →{' '}
                      {booking.toNameEn} ({booking.toCode}) {booking.arrivalTime} ·{' '}
                      {booking.journeyDate}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span
                      className={`text-xs font-bold font-mono-tabular ${
                        booking.status === 'CONFIRMED'
                          ? 'text-emerald-700'
                          : isCancelled || booking.status === 'PAYMENT_FAILED'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {booking.status}
                    </span>
                    <div className="font-mono-tabular text-lg font-bold text-slate-900">
                      ₹{booking.totalFare}
                    </div>
                  </div>
                </div>

                {/* Coach, Seats, Passengers */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
                  <div>
                    <span className="font-semibold">
                      {booking.coachCode} ({booking.coachType}) · Seats{' '}
                      <span className="font-mono-tabular font-bold">
                        {booking.seatNumbers.join(', ')}
                      </span>
                    </span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span>{booking.passengers.map((p) => p.fullName).join(', ')}</span>
                  </div>
                  <span className="text-slate-500 font-medium">
                    {booking.paymentMethod ?? 'CHECKOUT'} · {booking.paymentStatus}
                  </span>
                </div>

                {/* Refund Tracker when Cancelled */}
                {isCancelled && booking.refundStatus !== 'NOT_APPLICABLE' && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {t.myBookings.refundTracker}:{' '}
                        <span className="text-blue-700 font-mono-tabular">
                          {booking.refundStatus}
                        </span>
                      </div>
                      <div className="text-slate-600 font-mono-tabular">
                        {t.myBookings.refundAmountLabel}: ₹{booking.refundAmount}
                      </div>
                    </div>

                    {booking.refundStatus !== 'REFUNDED' && (
                      <button
                        type="button"
                        disabled={busyPnr === booking.pnr}
                        onClick={async () => {
                          setBusyPnr(booking.pnr);
                          setActionError(null);
                          try {
                            await onAdvanceRefund(booking.pnr);
                          } catch (err) {
                            setActionError((err as Error).message);
                          } finally {
                            setBusyPnr(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Update Refund Stage</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => downloadDemoTicketPdf(booking, appName)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.myBookings.downloadTicket}</span>
                  </button>

                  {canCancel && cancelTarget !== booking.pnr && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(booking.pnr)}
                      data-testid={`cancel-btn-${booking.pnr}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t.myBookings.cancelBooking}</span>
                    </button>
                  )}
                </div>

                {/* Inline Cancellation Confirmation */}
                {cancelTarget === booking.pnr && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-red-900 space-y-0.5">
                      <div className="font-bold">{t.myBookings.cancelConfirmTitle}</div>
                      <p>{t.myBookings.cancelConfirmDesc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCancelTarget(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg"
                      >
                        {t.common.close}
                      </button>
                      <button
                        type="button"
                        disabled={busyPnr === booking.pnr}
                        onClick={async () => {
                          setBusyPnr(booking.pnr);
                          setActionError(null);
                          try {
                            await onCancelBooking(booking.pnr);
                            setCancelTarget(null);
                          } catch (err) {
                            setActionError((err as Error).message);
                          } finally {
                            setBusyPnr(null);
                          }
                        }}
                        data-testid={`confirm-cancel-${booking.pnr}`}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                      >
                        {t.myBookings.confirmCancelBtn}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg disabled:opacity-40"
              >
                Prev
              </button>
              <span className="font-mono-tabular text-slate-600">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
};
