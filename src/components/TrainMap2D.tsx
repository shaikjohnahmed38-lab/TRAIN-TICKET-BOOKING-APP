import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Layers,
  Lock,
  TrainFront,
  X,
} from 'lucide-react';
import { CompleteTrainCutaway } from './train-map/CompleteTrainCutaway';
import { CoachCutawayInterior } from './train-map/CoachCutawayInterior';
import { COACH_TEMPLATES } from '../utils/coachLayouts';
import type {
  CoachSummary,
  Language,
  SeatRecord,
  TrainSearchResult,
} from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface TrainMap2DProps {
  train: TrainSearchResult;
  selectedCoach: CoachSummary;
  seats: SeatRecord[];
  selectedSeatNumbers: number[];
  sessionId: string;
  holdDurationMinutes?: number;
  isLoadingSeats: boolean;
  isHolding: boolean;
  errorMsg: string | null;
  onBackToResults: () => void;
  onSelectCoach: (coach: CoachSummary) => void;
  onToggleSeat: (seat: SeatRecord) => void;
  onClearSelection: () => void;
  onHoldAndProceed: () => void;
  language: Language;
  t: TranslationDictionary;
}

export const TrainMap2D: React.FC<TrainMap2DProps> = ({
  train,
  selectedCoach,
  seats,
  selectedSeatNumbers,
  sessionId,
  holdDurationMinutes = 15,
  isLoadingSeats,
  isHolding,
  errorMsg,
  onBackToResults,
  onSelectCoach,
  onToggleSeat,
  onClearSelection,
  onHoldAndProceed,
  language,
  t,
}) => {
  // Exact visual navigation: COMPLETE TRAIN VIEW -> SELECT COACH -> OPEN COACH INTERIOR
  const [viewMode, setViewMode] = useState<'consist' | 'interior'>('consist');

  useEffect(() => {
    setViewMode('consist');
  }, [train.id]);

  const template = COACH_TEMPLATES[selectedCoach.coachType];
  const seatByNum = new Map<number, SeatRecord>(seats.map((s) => [s.seatNumber, s]));
  const selectedRecords = selectedSeatNumbers
    .map((n) => seatByNum.get(n))
    .filter((s): s is SeatRecord => Boolean(s));
  const hasWaitlistSelected = selectedRecords.some((s) => s.status === 'WAITING_LIST');
  const totalDemoFare = selectedSeatNumbers.length * selectedCoach.fare;

  const handleChooseCoachAndOpenInterior = (coach: CoachSummary) => {
    if (coach.id !== selectedCoach.id) {
      onSelectCoach(coach);
    }
    setViewMode('interior');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 md:py-7 pb-36 md:pb-12 space-y-5">
      {/* Top Bar: Back + Train Info + Visual Navigation Steps */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={viewMode === 'interior' ? () => setViewMode('consist') : onBackToResults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              {viewMode === 'interior'
                ? language === 'te'
                  ? 'పూర్తి రైలు వీక్షణ'
                  : 'Complete Train View'
                : t.common.back}
            </span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-tabular text-sm font-bold text-blue-700">
                #{train.trainNumber}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                {language === 'te' ? train.nameTe : train.nameEn}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-mono-tabular">
              {train.fromStation.code} ({train.departureTime}) → {train.toStation.code} (
              {train.arrivalTime}) · {train.journeyDate}
            </p>
          </div>
        </div>

        {/* Visual Navigation Mode Switcher */}
        <div
          role="tablist"
          aria-label="Train visualization view"
          className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'consist'}
            onClick={() => setViewMode('consist')}
            data-testid="nav-complete-train-btn"
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 ${
              viewMode === 'consist'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <TrainFront className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">1. Complete Train</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'interior'}
            onClick={() => setViewMode('interior')}
            data-testid="nav-coach-interior-btn"
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 ${
              viewMode === 'interior'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              2. Interior ({selectedCoach.coachCode} · {selectedCoach.coachType})
            </span>
          </button>
        </div>
      </div>

      {/* STAGE 1: COMPLETE TOP-DOWN TRAIN VIEW */}
      {viewMode === 'consist' ? (
        <div className="space-y-5">
          <CompleteTrainCutaway
            train={train}
            selectedCoachId={selectedCoach.id}
            onSelectCoach={handleChooseCoachAndOpenInterior}
            language={language}
          />

          {/* Quick Coach Breakdown Grid for Direct Selection */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'te'
                ? 'కోచ్ వివరాలు & డెమో ధరలు (లోపలి భాగం తెరవడానికి నొక్కండి)'
                : 'Coach Directory (Tap any coach to open roof-removed 2D interior)'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {train.coaches.map((coach) => {
                const tpl = COACH_TEMPLATES[coach.coachType];
                return (
                  <button
                    key={coach.id}
                    type="button"
                    onClick={() => handleChooseCoachAndOpenInterior(coach)}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-400 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tabular text-sm font-bold text-slate-900">
                        {coach.coachCode}
                      </span>
                      <span className="font-mono-tabular text-xs font-bold text-blue-700">
                        {coach.coachType}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {language === 'te' ? tpl.titleTe : tpl.titleEn}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono-tabular mt-2 pt-1.5 border-t border-slate-200/80">
                      <span className="text-emerald-700 font-semibold">
                        {coach.availableCount} AVL
                      </span>
                      <span className="font-bold text-slate-900">₹{coach.fare}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* STAGE 2 & 3: SELECTED COACH -> ROOF-REMOVED 2D CUTAWAY INTERIOR */
        <div className="space-y-5">
          {/* Quick Coach Switcher Strip */}
          <section className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1">
                {t.common.coach}:
              </span>
              {train.coaches.map((coach) => {
                const active = coach.id === selectedCoach.id;
                return (
                  <button
                    key={coach.id}
                    type="button"
                    onClick={() => handleChooseCoachAndOpenInterior(coach)}
                    data-testid={`coach-card-${coach.coachCode}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-bold border whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-blue-700 border-blue-800 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {coach.coachCode} ({coach.coachType}) · ₹{coach.fare}
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-mono-tabular text-slate-500">
              {selectedCoach.availableCount} {t.results.available} · {selectedCoach.bookedCount}{' '}
              Booked · {selectedCoach.waitingListCount} WL
            </span>
          </section>

          {/* Status Colour Legend */}
          <section
            aria-label="Seat status legend"
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 rounded border-2 border-slate-400 bg-white inline-block" />
                <span>{t.trainMap.legendAvailable}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 rounded border-2 border-emerald-700 bg-emerald-100 inline-block" />
                <span>{t.trainMap.legendBooked}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 rounded border-2 border-amber-600 bg-amber-100 inline-block" />
                <span>{t.trainMap.legendWaitlist}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 rounded border-2 border-blue-900 bg-blue-600 inline-flex items-center justify-center text-white">
                  <Check className="w-3 h-3" />
                </span>
                <span>{t.trainMap.legendSelected}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 rounded border-2 border-slate-400 bg-slate-200 inline-flex items-center justify-center text-slate-600">
                  <Lock className="w-2.5 h-2.5" />
                </span>
                <span>{t.trainMap.legendHeld}</span>
              </span>
            </div>

            <span className="text-xs font-mono-tabular font-semibold text-slate-700">
              {language === 'te' ? template.titleTe : template.titleEn} · {selectedCoach.totalSeats}{' '}
              {t.common.seats}
            </span>
          </section>

          {/* Architectural Roof-Removed Coach Floor Plan */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Coach {selectedCoach.coachCode} —{' '}
                  {language === 'te' ? template.titleTe : template.titleEn} (Top-Down Cutaway)
                </h2>
                <p className="text-xs text-slate-600">
                  Roof removed · Tap any White (Available) or Yellow (Waiting List) berth to select.
                </p>
              </div>
              {selectedSeatNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{t.trainMap.clearSelection}</span>
                </button>
              )}
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium"
              >
                {errorMsg}
              </div>
            )}

            {isLoadingSeats ? (
              <div className="h-72 rounded-2xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-sm text-slate-500">
                {t.common.loading}
              </div>
            ) : (
              <CoachCutawayInterior
                coach={selectedCoach}
                seats={seats}
                selectedSeatNumbers={selectedSeatNumbers}
                sessionId={sessionId}
                onToggleSeat={onToggleSeat}
                language={language}
              />
            )}
          </section>

          {/* Selected Berths Summary Panel (Seat #, Berth Type, Coach #, Demo Fare) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-2 flex-1">
              <div className="text-xs font-semibold text-slate-500">
                {t.trainMap.selectedSeatsLabel} ({selectedRecords.length})
              </div>

              {selectedRecords.length === 0 ? (
                <p className="text-sm text-slate-600">{t.trainMap.noSeatsSelected}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedRecords.map((seat) => (
                    <button
                      key={seat.seatNumber}
                      type="button"
                      onClick={() => onToggleSeat(seat)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs bg-blue-50 text-blue-950 border border-blue-200 rounded-xl hover:bg-blue-100 text-left"
                    >
                      <span className="font-mono-tabular font-bold text-blue-700">
                        Coach {selectedCoach.coachCode} · Seat {seat.seatNumber} ({seat.berthType})
                      </span>
                      <span className="font-mono-tabular font-semibold text-slate-700">
                        ₹{selectedCoach.fare}
                      </span>
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  ))}
                </div>
              )}

              {hasWaitlistSelected && (
                <p className="text-xs font-medium text-amber-800">{t.trainMap.waitlistNotice}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
              <div>
                <div className="text-xs text-slate-500">
                  {t.trainMap.totalDemoFare} ({selectedSeatNumbers.length} {t.common.passengers})
                </div>
                <div className="font-mono-tabular text-2xl font-bold text-slate-900">
                  ₹{totalDemoFare}
                </div>
              </div>

              <button
                type="button"
                disabled={selectedSeatNumbers.length === 0 || isHolding}
                onClick={onHoldAndProceed}
                data-testid="hold-proceed-btn"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0"
              >
                <Clock className="w-4 h-4" />
                <span>
                  {isHolding
                    ? t.common.loading
                    : `${t.trainMap.holdAndProceed} (${holdDurationMinutes}m)`}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};
