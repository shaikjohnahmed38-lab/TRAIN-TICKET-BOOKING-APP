import React from 'react';
import { ArrowLeftRight, Calendar, Clock, Search, TrainFront } from 'lucide-react';
import { StationAutocomplete } from './StationAutocomplete';
import type { Language, Station } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface SearchScreenProps {
  stations: Station[];
  fromCode: string;
  toCode: string;
  journeyDate: string;
  timeWindow: string;
  onChangeFrom: (code: string) => void;
  onChangeTo: (code: string) => void;
  onChangeDate: (date: string) => void;
  onChangeTimeWindow: (window: string) => void;
  onSwap: () => void;
  onSearch: () => void;
  isLoading: boolean;
  errorMsg: string | null;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  t: TranslationDictionary;
}

const POPULAR_ROUTES = [
  { from: 'SC', to: 'VSKP', labelEn: 'Secunderabad → Visakhapatnam', labelTe: 'సికింద్రాబాద్ → విశాఖపట్నం' },
  { from: 'SC', to: 'TPTY', labelEn: 'Secunderabad → Tirupati', labelTe: 'సికింద్రాబాద్ → తిరుపతి' },
  { from: 'SC', to: 'BZA', labelEn: 'Secunderabad → Vijayawada', labelTe: 'సికింద్రాబాద్ → విజయవాడ' },
  { from: 'VSKP', to: 'BZA', labelEn: 'Visakhapatnam → Vijayawada', labelTe: 'విశాఖపట్నం → విజయవాడ' },
];

const DEMO_DEPARTURE_TIMES = [
  { trainNo: '20834', route: 'SC → VSKP', dep: '05:05', window: 'MORNING' },
  { trainNo: '17406', route: 'TPTY → SC', dep: '05:45', window: 'MORNING' },
  { trainNo: '17202', route: 'SC → GNT', dep: '13:05', window: 'AFTERNOON' },
  { trainNo: '12704', route: 'SC → VSKP', dep: '15:55', window: 'AFTERNOON' },
  { trainNo: '12728', route: 'HYB → VSKP', dep: '17:00', window: 'EVENING' },
  { trainNo: '12734', route: 'SC → TPTY', dep: '18:05', window: 'EVENING' },
  { trainNo: '12740', route: 'SC → VSKP', dep: '21:15', window: 'NIGHT' },
];

export const SearchScreen: React.FC<SearchScreenProps> = ({
  stations,
  fromCode,
  toCode,
  journeyDate,
  timeWindow,
  onChangeFrom,
  onChangeTo,
  onChangeDate,
  onChangeTimeWindow,
  onSwap,
  onSearch,
  isLoading,
  errorMsg,
  language,
  onLanguageChange,
  t,
}) => {
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 pb-24 md:pb-12 space-y-8">
      {/* Workspace Sub-toolbar with Demo Notice & Language Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <p className="text-xs sm:text-sm text-slate-600 font-medium">
          {t.common.demoNotice}
        </p>

        <div
          role="group"
          aria-label="Language switcher"
          className="hidden md:inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200"
        >
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
              language === 'en'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {t.common.english}
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('te')}
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
              language === 'te'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {t.common.telugu}
          </button>
        </div>
      </div>

      {/* Hero + Search Form */}
      <section className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs font-semibold text-blue-700 tracking-wide">
            {t.search.eyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight text-balance">
            {t.search.headline}
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            {t.search.subheadline}
          </p>

          {/* Popular AP & Telangana Corridor Quick-Fills */}
          <div className="pt-2 space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-500">
              {t.search.popularCorridors}
            </h2>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ROUTES.map((route) => {
                const active = fromCode === route.from && toCode === route.to;
                return (
                  <button
                    key={`${route.from}-${route.to}`}
                    type="button"
                    onClick={() => {
                      onChangeFrom(route.from);
                      onChangeTo(route.to);
                    }}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {language === 'te' ? route.labelTe : route.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Primary Search Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearch();
            }}
            className="space-y-5"
          >
            <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
              <StationAutocomplete
                label={t.search.fromLabel}
                placeholder={t.search.fromPlaceholder}
                stations={stations}
                selectedCode={fromCode}
                onSelect={(s) => onChangeFrom(s.code)}
                language={language}
              />

              <div className="flex justify-center pb-0.5">
                <button
                  type="button"
                  onClick={onSwap}
                  aria-label={t.search.swapStations}
                  className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 flex items-center justify-center transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <StationAutocomplete
                label={t.search.toLabel}
                placeholder={t.search.toPlaceholder}
                stations={stations}
                selectedCode={toCode}
                onSelect={(s) => onChangeTo(s.code)}
                language={language}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="journey-date"
                  className="block text-xs font-semibold text-slate-600 mb-1.5"
                >
                  {t.search.dateLabel}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-blue-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="journey-date"
                    type="date"
                    min={minDate}
                    value={journeyDate}
                    onChange={(e) => onChangeDate(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg font-mono-tabular focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="departure-window"
                  className="block text-xs font-semibold text-slate-600 mb-1.5"
                >
                  {t.search.timeFilterLabel}
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-blue-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="departure-window"
                    value={timeWindow}
                    onChange={(e) => onChangeTimeWindow(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="ALL">{t.search.allDepartures}</option>
                    <option value="MORNING">{t.search.morning}</option>
                    <option value="AFTERNOON">{t.search.afternoon}</option>
                    <option value="EVENING">{t.search.evening}</option>
                    <option value="NIGHT">{t.search.night}</option>
                  </select>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{isLoading ? t.common.loading : t.search.searchButton}</span>
            </button>
          </form>
        </div>
      </section>

      {/* Available Demo Departure Times Strip */}
      <section className="border-t border-slate-200 pt-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrainFront className="w-4 h-4 text-blue-700" />
            <span>{t.search.recentTrainsTitle}</span>
          </h2>
          <span className="text-xs text-slate-500">AP &amp; Telangana Express Network</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {DEMO_DEPARTURE_TIMES.map((item) => (
            <button
              key={item.trainNo}
              type="button"
              onClick={() => {
                const [f, to] = item.route.split(' → ');
                onChangeFrom(f);
                onChangeTo(to);
                onChangeTimeWindow(item.window);
              }}
              className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 text-left transition-colors"
            >
              <div className="font-mono-tabular text-base font-bold text-blue-700">
                {item.dep}
              </div>
              <div className="text-xs font-semibold text-slate-900 mt-0.5">{item.route}</div>
              <div className="font-mono-tabular text-xs text-slate-500">#{item.trainNo}</div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};
