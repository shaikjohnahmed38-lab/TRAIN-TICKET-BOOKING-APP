import React, { useEffect, useState } from 'react';
import { CheckCircle2, Globe, Layers, Settings, Shield, ShieldAlert } from 'lucide-react';
import type {
  AppConfigRecord,
  CoachType,
  CustomerUser,
  IntegrationStatusMap,
  Language,
  PricingRule,
} from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface SettingsScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  appConfig: AppConfigRecord;
  user: CustomerUser | null;
  integrations: IntegrationStatusMap | null;
  pricingRules: Record<CoachType, PricingRule>;
  onUpdateAppName: (name: string) => Promise<void>;
  onUpdatePricingRule: (coachType: CoachType, updates: Partial<PricingRule>) => Promise<void>;
  onOpenAdmin: () => void;
  t: TranslationDictionary;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  language,
  onLanguageChange,
  appConfig,
  user,
  integrations,
  pricingRules,
  onUpdateAppName,
  onUpdatePricingRule,
  onOpenAdmin,
  t,
}) => {
  const isAdmin = user?.role === 'admin';
  const [draftName, setDraftName] = useState(appConfig.appName);
  const [savingName, setSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const [savingCoach, setSavingCoach] = useState<CoachType | null>(null);
  const [pricingFeedback, setPricingFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(appConfig.appName);
  }, [appConfig.appName]);

  const integrationRows = integrations
    ? [
        integrations.database,
        integrations.realtime,
        integrations.smtpEmail,
        integrations.twilioSms,
        integrations.razorpayPayments,
        integrations.officialRailwayApi,
      ]
    : [];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.settings.title}</h1>
          <p className="text-sm text-slate-600 mt-0.5">{t.settings.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onOpenAdmin}
          data-testid="settings-open-admin-btn"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
        >
          <Shield className="w-4 h-4" />
          <span>Open Admin Portal</span>
        </button>
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

      {/* Application Identity & Operational Parameters */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-700" />
          <span>{t.settings.appNameSection}</span>
        </h2>

        {isAdmin ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!draftName.trim()) return;
              setSavingName(true);
              setNameFeedback(null);
              setErrorMsg(null);
              try {
                await onUpdateAppName(draftName.trim());
                setNameFeedback('Application name saved to database.');
              } catch (err) {
                setErrorMsg((err as Error).message);
              } finally {
                setSavingName(false);
              }
            }}
            className="flex flex-wrap gap-3 items-center max-w-lg"
          >
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              aria-label="Application Name"
              className="flex-1 h-10 px-3 text-sm border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={savingName}
              className="h-10 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              {savingName ? '...' : 'Save Name'}
            </button>
          </form>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Application Name</div>
              <div className="font-bold text-slate-900 mt-0.5">{appConfig.appName}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Seat Hold Window</div>
              <div className="font-mono-tabular font-bold text-slate-900 mt-0.5">
                {appConfig.holdDurationMinutes} minutes
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Max Seats / Booking</div>
              <div className="font-mono-tabular font-bold text-slate-900 mt-0.5">
                {appConfig.maxSeatsPerBooking} seats
              </div>
            </div>
          </div>
        )}
        {nameFeedback && <p className="text-xs font-semibold text-emerald-700">{nameFeedback}</p>}
      </section>

      {/* Pricing Rules (Editable by Admin only, read-only for customers) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t.settings.pricingSection}</h2>
            {!isAdmin && (
              <p className="text-xs text-slate-500">
                Read-only tariff table. Admin authentication required to modify fare rules.
              </p>
            )}
          </div>
          {pricingFeedback && (
            <span className="text-xs font-semibold text-emerald-700">{pricingFeedback}</span>
          )}
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4 font-semibold">Class</th>
                <th className="py-2 px-3 font-semibold">Base Fare (₹)</th>
                <th className="py-2 px-3 font-semibold">Per Km (₹)</th>
                <th className="py-2 px-3 font-semibold">Res. Fee (₹)</th>
                {isAdmin && <th className="py-2 pl-3 text-right font-semibold">Action</th>}
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
                    editable={Boolean(isAdmin)}
                    saving={savingCoach === ct}
                    onSave={async (updates) => {
                      setSavingCoach(ct);
                      setPricingFeedback(null);
                      setErrorMsg(null);
                      try {
                        await onUpdatePricingRule(ct, updates);
                        setPricingFeedback(`Updated ${ct} tariff.`);
                      } catch (err) {
                        setErrorMsg((err as Error).message);
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

      {/* Honest Live Integration & Gateway Status */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" />
          <span>{t.settings.futureArchitectureSection}</span>
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          {integrationRows.map((item) => (
            <div
              key={item.key}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                {item.configured ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                    <ShieldAlert className="w-3.5 h-3.5" /> Not Configured
                  </span>
                )}
              </div>
              <p className="text-slate-600">{item.description}</p>
              {!item.configured && item.missingVars.length > 0 && (
                <div className="font-mono-tabular text-[11px] text-slate-500 pt-1">
                  Required env: {item.missingVars.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

const PricingRowEditor: React.FC<{
  rule: PricingRule;
  editable: boolean;
  saving: boolean;
  onSave: (updates: Partial<PricingRule>) => Promise<void>;
}> = ({ rule, editable, saving, onSave }) => {
  const [baseFare, setBaseFare] = useState(String(rule.baseFare));
  const [perKmRate, setPerKmRate] = useState(String(rule.perKmRate));
  const [reservationFee, setReservationFee] = useState(String(rule.reservationFee));

  useEffect(() => {
    setBaseFare(String(rule.baseFare));
    setPerKmRate(String(rule.perKmRate));
    setReservationFee(String(rule.reservationFee));
  }, [rule]);

  return (
    <tr>
      <td className="py-2.5 pr-4 font-mono-tabular font-bold text-slate-900">
        {rule.coachType} · <span className="font-sans font-normal text-slate-600">{rule.labelEn}</span>
      </td>
      <td className="py-2.5 px-3">
        {editable ? (
          <input
            type="number"
            aria-label={`${rule.coachType} Base Fare`}
            value={baseFare}
            onChange={(e) => setBaseFare(e.target.value)}
            className="w-24 h-8 px-2 border border-slate-300 rounded font-mono-tabular text-xs"
          />
        ) : (
          <span className="font-mono-tabular text-xs">₹{rule.baseFare}</span>
        )}
      </td>
      <td className="py-2.5 px-3">
        {editable ? (
          <input
            type="number"
            step="0.05"
            aria-label={`${rule.coachType} Per Km Rate`}
            value={perKmRate}
            onChange={(e) => setPerKmRate(e.target.value)}
            className="w-20 h-8 px-2 border border-slate-300 rounded font-mono-tabular text-xs"
          />
        ) : (
          <span className="font-mono-tabular text-xs">₹{rule.perKmRate}</span>
        )}
      </td>
      <td className="py-2.5 px-3">
        {editable ? (
          <input
            type="number"
            aria-label={`${rule.coachType} Reservation Fee`}
            value={reservationFee}
            onChange={(e) => setReservationFee(e.target.value)}
            className="w-20 h-8 px-2 border border-slate-300 rounded font-mono-tabular text-xs"
          />
        ) : (
          <span className="font-mono-tabular text-xs">₹{rule.reservationFee}</span>
        )}
      </td>
      {editable && (
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
      )}
    </tr>
  );
};
