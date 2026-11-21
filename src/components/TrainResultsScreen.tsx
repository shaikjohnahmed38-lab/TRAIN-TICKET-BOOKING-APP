import React from 'react';
import { ArrowLeft, ArrowRight, Clock, TrainFront } from 'lucide-react';
import { formatDuration } from '../utils/fareCalculator';
import type { CoachSummary, CoachType, Language, TrainSearchResult } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface TrainResultsScreenProps {
  trains: TrainSearchResult[];
  fromCode: string;
  toCode: string;
  journeyDate: string;
  onBackToSearch: () => void;
  onSelectTrainForMap: (train: TrainSearchResult, coachId?: string) => void;
  language: Language;
  t: TranslationDictionary;
}

function summarizeCoachClasses(coaches: CoachSummary[]): Array<{
  coachType: CoachType;
  firstCoachId: string;
  available: number;
  waitlist: number;
  fare: number;
}> {
  const byType = new Map<
    CoachType,
    { coachType: CoachType; firstCoachId: string; available: number; waitlist: number; fare: number }
  >();
  for (const c of coaches) {
    const prev = byType.get(c.coachType);
    if (!prev) {
      byType.set(c.coachType, {
        coachType: c.coachType,
        firstCoachId: c.id,
        available: c.availableCount,
        waitlist: c.waitingListCount,
        fare: c.fare,
      });
    } else {
      prev.available += c.availableCount;
      prev.waitlist += c.waitingListCount;
    }
  }
  return Array.from(byType.values());
}

export const TrainResultsScreen: React.FC<TrainResultsScreenProps> = ({
  trains,
  fromCode,
  toCode,
  journeyDate,
  onBackToSearch,
  onSelectTrainForMap,
  language,
  t,
}) => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-12 space-y-6">
      {/* Header & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToSearch}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.common.back}</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t.results.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-mono-tabular">
              {fromCode} → {toCode} · {journeyDate} · {trains.length} {t.results.foundTrains}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToSearch}
          className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-blue-700 border border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          {t.results.modifySearch}
        </button>
      </div>

      {/* Empty State */}
      {trains.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <TrainFront className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t.results.noTrainsTitle}</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">{t.results.noTrainsDesc}</p>
          <button
            type="button"
            onClick={onBackToSearch}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            {t.results.modifySearch}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {trains.map((train) => {
            const classSummaries = summarizeCoachClasses(train.coaches);
            const lowestFare = Math.min(...classSummaries.map((c) => c.fare));

            return (
              <article
                key={train.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 hover:border-blue-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Train Name & Route Timing */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono-tabular font-bold text-blue-700">
                        #{train.trainNumber}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">
                        {language === 'te' ? train.nameTe : train.nameEn}
                      </h2>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-slate-500">{t.results.runsDaily}</span>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-w-xl">
                      <div>
                        <div className="font-mono-tabular text-xl font-bold text-slate-900">
                          {train.departureTime}
                        </div>
                        <div className="text-xs font-medium text-slate-600">
                          {language === 'te' ? train.fromStation.nameTe : train.fromStation.nameEn}{' '}
                          ({train.fromStation.code})
                        </div>
                      </div>

                      <div className="text-center px-2">
                        <div className="inline-flex items-center gap-1 text-xs font-mono-tabular text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDuration(train.durationMinutes)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300 my-0.5">
                          <span className="h-px w-10 sm:w-16 bg-slate-300" />
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-500">
                          {train.distanceKm} km
                        </div>
                      </div>

                      <div className="text-right sm:text-left">
                        <div className="font-mono-tabular text-xl font-bold text-slate-900">
                          {train.arrivalTime}
                        </div>
                        <div className="text-xs font-medium text-slate-600">
                          {language === 'te' ? train.toStation.nameTe : train.toStation.nameEn}{' '}
                          ({train.toStation.code})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-2 shrink-0">
                    <div className="text-left lg:text-right">
                      <div className="text-xs text-slate-500">
                        {t.results.demoPriceFrom} ({t.common.demoFareBadge})
                      </div>
                      <div className="font-mono-tabular text-xl font-bold text-slate-900">
                        ₹{lowestFare}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectTrainForMap(train)}
                      className="px-5 py-3 text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors whitespace-nowrap shrink-0"
                    >
                      {t.results.viewSeatMapCta}
                    </button>
                  </div>
                </div>

                {/* Interactive Coach Class Availability Buttons */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {classSummaries.map((cls) => (
                      <button
                        key={cls.coachType}
                        type="button"
                        onClick={() => onSelectTrainForMap(train, cls.firstCoachId)}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular text-sm font-bold text-slate-900">
                            {cls.coachType}
                          </span>
                          <span className="font-mono-tabular text-sm font-bold text-blue-700">
                            ₹{cls.fare}
                          </span>
                        </div>
                        <div className="text-xs font-medium mt-1 text-emerald-700 font-mono-tabular">
                          {cls.available > 0
                            ? `${cls.available} ${t.results.available}`
                            : `${cls.waitlist} ${t.results.waitingList}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};
