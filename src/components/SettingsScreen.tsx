import React, { useState } from 'react';
import { Globe, Layers, Settings, ShieldAlert } from 'lucide-react';
import type { CoachType, Language, PricingRule } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface SettingsScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  appName: string;
  onUpdateAppName: (name: string) => void;
  pricingRules: Record<CoachType, PricingRule>;
  onUpdatePricingRule: (coachType: CoachType, updates: Partial<PricingRule>) => Promise<void>;
  t: TranslationDictionary;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  language,
  onLanguageChange,
  appName,
  onUpdateAppName,
  pricingRules,
  onUpdatePricingRule,
  t,
}) => {
  const [draftName, setDraftName] = useState(appName);
  const [savingCoach, setSavingCoach] = useState<CoachType | null>(null);
  const [pricingFeedback, setPricingFeedback] = useState<string | null>(null);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-12 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">{t.settings.title}</h1>
        <p className="text-sm text-slate-600 mt-0.5">{t.settings.subtitle}</p>
      </div>

      {/* Language Switcher */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-700" />
          <span>{t.settings.languageSection}</span>
        </h2>
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              language === 'en' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('te')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              language === 'te' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            తెలుగు (Telugu)
          </button>
        </div>
      </section>

      {/* Configurable App Name Placeholder */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-700" />
          <span>{t.settings.appNameSection}</span>
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draftName.trim()) {
              onUpdateAppName(draftName.trim());
            }
          }}
          className="flex flex-wrap gap-3 items-center max-w-lg"
        >
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            aria-label="Configurable Application Name"
            className="flex-1 h-10 px-3 text-sm border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            className="h-10 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
          >
            Apply Name
          </button>
        </form>
      </section>

      {/* Configurable Demo Pricing Table */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">{t.settings.pricingSection}</h2>
          {pricingFeedback && (
            <span className="text-xs font-semibold text-emerald-700">{pricingFeedback}</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4 font-semibold">Class</th>
                <th className="py-2 px-3 font-semibold">Base Fare (₹)</th>
                <th className="py-2 px-3 font-semibold">Per Km (₹)</th>
                <th className="py-2 px-3 font-semibold">Res. Fee (₹)</th>
                <th className="py-2 pl-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(['1A', '2A', '3A', 'SL', 'GS'] as CoachType[]).map((ct) => {
                const rule = pricingRules[ct];
                if (!rule) return null;
                return (
                  <PricingRowEditor
                    key={ct}
                    rule={rule}
                    saving={savingCoach === ct}
                    onSave={async (updates) => {
                      setSavingCoach(ct);
                      setPricingFeedback(null);
                      try {
                        await onUpdatePricingRule(ct, updates);
                        setPricingFeedback(`Updated ${ct} demo tariff.`);
                      } finally {
                        setSavingCoach(null);
                      }
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Future Admin, Owner & Official Railway API Architecture Readiness */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" />
          <span>{t.settings.futureArchitectureSection}</span>
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 text-sm">
              Future Admin &amp; Owner Portals (Modular Ready)
            </div>
            <p>
              Database tables and pricing config routes are structured for future Train, Coach,
              Seat, Pricing, Booking Status, Notification, and Analytics dashboards without blocking
              customer workflows.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Official Railway Integration Boundary</span>
            </div>
            <p>
              Currently powered by <code className="font-mono-tabular">DemoRailwayAdapter</code>{' '}
              with local SQLite persistence. Live Indian Railways / IRCTC search, official PNR,
              and real payment gateway adapters remain disabled until authorized API credentials and
              commercial approvals are configured.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

const PricingRowEditor: React.FC<{
  rule: PricingRule;
  saving: boolean;
  onSave: (updates: Partial<PricingRule>) => Promise<void>;
}> = ({ rule, saving, onSave }) => {
  const [baseFare, setBaseFare] = useState(String(rule.baseFare));
  const [perKmRate, setPerKmRate] = useState(String(rule.perKmRate));
  const [reservationFee, setReservationFee] = useState(String(rule.reservationFee));

  return (
    <tr>
      <td className="py-2.5 pr-4 font-mono-tabular font-bold text-slate-900">
        {rule.coachType} · <span className="font-sans font-normal text-slate-600">{rule.labelEn}</span>
      </td>
      <td className="py-2.5 px-3">
        <input
          type="number"
          aria-label={`${rule.coachType} Base Fare`}
          value={baseFare}
          onChange={(e) => setBaseFare(e.target.value)}
          className="w-24 h-8 px-2 border border-slate-300 rounded font-mono-tabular text-xs"
        />
      </td>
      <td className="py-2.5 px-3">
        <input
          type="number"
          step="0.05"
          aria-label={`${rule.coachType} Per Km Rate`}
          value={perKmRate}
          onChange={(e) => setPerKmRate(e.target.value)}
          className="w-20 h-8 px-2 border border-slate-300 rounded font-mono-tabular text-xs"
        />
      </td>
      <td className="py-2.5 px-3">
        <input
          type="number"
          aria-label={`${rule.coachType} Reservation Fee`}
          value={reservationFee}
          onChange={(e) => setReservationFee(e.target.value)}
          className="w-20 h-8 px-2 border border-slate-300 rounded font-mono-tabular text-xs"
        />
      </td>
      <td className="py-2.5 pl-3 text-right">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              baseFare: Number(baseFare),
              perKmRate: Number(perKmRate),
              reservationFee: Number(reservationFee),
            })
          }
          className="px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg"
        >
          {saving ? '...' : 'Save'}
        </button>
      </td>
    </tr>
  );
};
