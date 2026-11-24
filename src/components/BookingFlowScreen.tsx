import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  CreditCard,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { calculateDemoFare, formatHoldCountdown } from '../utils/fareCalculator';
import type {
  CoachSummary,
  CoachType,
  CustomerUser,
  IntegrationStatusMap,
  Language,
  PassengerInput,
  PaymentMethod,
  PricingRule,
  SavedPassenger,
  SeatRecord,
  TrainSearchResult,
} from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface BookingFlowScreenProps {
  train: TrainSearchResult;
  coach: CoachSummary;
  selectedSeats: SeatRecord[];
  holdExpiresAt: number;
  holdDurationMinutes: number;
  pricingRules: Record<CoachType, PricingRule>;
  user: CustomerUser | null;
  savedPassengers: SavedPassenger[];
  integrations: IntegrationStatusMap | null;
  onQuickLoginPassword: (identifier: string, password: string) => Promise<void>;
  onQuickRequestOtp: (mobile: string) => Promise<{
    hint?: string;
    deliveryMode: 'TWILIO' | 'SANDBOX';
  }>;
  onQuickVerifyOtp: (mobile: string, otp: string) => Promise<void>;
  onCancelHold: () => Promise<void>;
  onHoldExpired: () => void;
  onCompletePayment: (params: {
    passengers: PassengerInput[];
    paymentMethod: PaymentMethod;
    outcome: 'SUCCESS' | 'PENDING' | 'FAILED';
    existingPnr?: string;
  }) => Promise<{ pnr: string; status: string }>;
  onRazorpayCheckout?: (params: {
    passengers: PassengerInput[];
    existingPnr?: string;
  }) => Promise<void>;
  language: Language;
  t: TranslationDictionary;
}

export const BookingFlowScreen: React.FC<BookingFlowScreenProps> = ({
  train,
  coach,
  selectedSeats,
  holdExpiresAt,
  holdDurationMinutes,
  pricingRules,
  user,
  savedPassengers,
  integrations,
  onQuickLoginPassword,
  onQuickRequestOtp,
  onQuickVerifyOtp,
  onCancelHold,
  onHoldExpired,
  onCompletePayment,
  onRazorpayCheckout,
  language,
  t,
}) => {
  const [nowMs, setNowMs] = useState(Date.now());
  const [subStep, setSubStep] = useState<'passengers' | 'payment'>('passengers');

  // Inline Auth state when user is not yet logged in
  const [quickAuthTab, setQuickAuthTab] = useState<'password' | 'otp'>('password');
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Passenger form state
  const [passengers, setPassengers] = useState<PassengerInput[]>(() =>
    selectedSeats.map((s, idx) => ({
      seatNumber: s.seatNumber,
      berthType: s.berthType,
      fullName: idx === 0 && user?.name ? user.name : '',
      age: idx === 0 && user?.age ? String(user.age) : '',
      gender: idx === 0 && user?.gender ? user.gender : 'Male',
    }))
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Payment state
  const razorpayConfigured = Boolean(integrations?.razorpayPayments.configured);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    razorpayConfigured ? 'RAZORPAY' : 'UPI'
  );
  const [upiId, setUpiId] = useState('traveller@upi');
  const [cardLast4, setCardLast4] = useState('4242');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: 'FAILED' | 'PENDING';
    pnr: string;
  } | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Autofill passenger 1 when user signs in mid-checkout and name is empty
  useEffect(() => {
    if (!user) return;
    setPassengers((prev) =>
      prev.map((p, idx) =>
        idx === 0 && !p.fullName.trim()
          ? {
              ...p,
              fullName: user.name || '',
              age: user.age ? String(user.age) : p.age,
              gender: user.gender ?? p.gender,
            }
          : p
      )
    );
  }, [user]);

  const countdown = formatHoldCountdown(holdExpiresAt, nowMs);

  const fare = calculateDemoFare(
    coach.coachType,
    train.distanceKm,
    selectedSeats.length,
    pricingRules
  );

  const updatePassenger = (
    index: number,
    field: keyof PassengerInput,
    value: string
  ) => {
    setPassengers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const applySavedPassenger = (index: number, saved: SavedPassenger) => {
    setPassengers((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              fullName: saved.fullName,
              age: String(saved.age),
              gender: saved.gender,
            }
          : p
      )
    );
  };

  const handleContinueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    for (const p of passengers) {
      const ageNum = Number(p.age);
      if (!p.fullName.trim() || !Number.isFinite(ageNum) || ageNum < 1 || ageNum > 115) {
        setValidationError(t.booking.validationError);
        return;
      }
    }
    setValidationError(null);
    setSubStep('payment');
  };

  const handlePaymentAction = async (outcome: 'SUCCESS' | 'PENDING' | 'FAILED') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setValidationError(null);
    try {
      if (paymentMethod === 'RAZORPAY' && outcome === 'SUCCESS' && onRazorpayCheckout) {
        await onRazorpayCheckout({
          passengers,
          existingPnr: paymentFeedback?.pnr,
        });
        return;
      }

      const res = await onCompletePayment({
        passengers,
        paymentMethod,
        outcome,
        existingPnr: paymentFeedback?.pnr,
      });
      if (outcome === 'FAILED') {
        setPaymentFeedback({ type: 'FAILED', pnr: res.pnr });
      }
    } catch (err) {
      setValidationError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (countdown.isExpired) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.booking.holdExpiredTitle}</h1>
          <p className="text-sm text-slate-600">{t.booking.holdExpiredDesc}</p>
          <button
            type="button"
            onClick={onHoldExpired}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
          >
            {t.common.back}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-12 space-y-6">
      {/* Live Seat Hold Timer Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={subStep === 'payment' ? () => setSubStep('passengers') : onCancelHold}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{subStep === 'payment' ? t.common.back : t.booking.releaseHoldCancel}</span>
          </button>
          <div>
            <div className="text-xs font-semibold text-blue-800">
              #{train.trainNumber} · {language === 'te' ? train.nameTe : train.nameEn}
            </div>
            <div className="text-xs font-mono-tabular text-slate-600">
              {coach.coachCode} ({coach.coachType}) · {t.common.seats}:{' '}
              {selectedSeats.map((s) => s.seatNumber).join(', ')}
            </div>
          </div>
        </div>

        <div
          data-testid="hold-timer-display"
          className="flex items-center gap-2 bg-white border border-blue-200 px-3.5 py-2 rounded-xl"
        >
          <Clock className="w-4 h-4 text-blue-700" />
          <span className="text-xs font-medium text-slate-600">
            {t.booking.holdBannerTitle} ({holdDurationMinutes}m)
          </span>
          <span className="font-mono-tabular text-base font-bold text-blue-700">
            {countdown.formatted}
          </span>
        </div>
      </div>

      {/* Stepper Indicator */}
      <div className="flex items-center gap-4 text-sm border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setSubStep('passengers')}
          className={`font-semibold pb-1 border-b-2 transition-colors ${
            subStep === 'passengers'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500'
          }`}
        >
          {t.booking.stepPassengers} &amp; {t.booking.fareSummaryTitle}
        </button>
        <span className="text-slate-300">/</span>
        <span
          className={`font-semibold pb-1 border-b-2 ${
            subStep === 'payment'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500'
          }`}
        >
          {t.booking.stepPayment}
        </span>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Optional Account Link */}
          {!user && subStep === 'passengers' && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-700" />
                    <span>{t.booking.loginRequiredTitle}</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">{t.booking.loginRequiredDesc}</p>
                </div>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuickAuthTab('password')}
                    className={`px-2.5 py-1 rounded font-semibold ${
                      quickAuthTab === 'password' ? 'bg-white text-blue-700' : 'text-slate-600'
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAuthTab('otp')}
                    className={`px-2.5 py-1 rounded font-semibold ${
                      quickAuthTab === 'otp' ? 'bg-white text-blue-700' : 'text-slate-600'
                    }`}
                  >
                    Mobile OTP
                  </button>
                </div>
              </div>

              {quickAuthTab === 'password' ? (
                <div className="grid sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-5">
                    <label htmlFor="quick-id" className="block text-xs font-medium text-slate-600 mb-1">
                      Email or Mobile
                    </label>
                    <input
                      id="quick-id"
                      type="text"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="you@example.com or 9876543210"
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label htmlFor="quick-pw" className="block text-xs font-medium text-slate-600 mb-1">
                      Password
                    </label>
                    <input
                      id="quick-pw"
                      type="password"
                      value={loginPw}
                      onChange={(e) => setLoginPw(e.target.value)}
                      placeholder="Password"
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={async () => {
                      setAuthError(null);
                      setAuthLoading(true);
                      try {
                        await onQuickLoginPassword(loginId, loginPw);
                      } catch (err) {
                        setAuthError((err as Error).message);
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                    className="sm:col-span-3 h-10 px-4 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
                  >
                    {authLoading ? '...' : 'Sign In'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-2.5">
                    <div className="flex-1 min-w-[180px]">
                      <label htmlFor="quick-mobile" className="block text-xs font-medium text-slate-600 mb-1">
                        {t.profile.mobileLabel}
                      </label>
                      <input
                        id="quick-mobile"
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="9876543210"
                        className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={async () => {
                        setAuthError(null);
                        setAuthLoading(true);
                        try {
                          const res = await onQuickRequestOtp(mobile);
                          setDemoOtpHint(res.hint ?? null);
                          setOtpRequested(true);
                        } catch (err) {
                          setAuthError((err as Error).message);
                        } finally {
                          setAuthLoading(false);
                        }
                      }}
                      className="h-10 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg whitespace-nowrap"
                    >
                      {t.profile.sendOtpBtn}
                    </button>
                  </div>

                  {otpRequested && (
                    <div className="space-y-2 pt-1">
                      {demoOtpHint && (
                        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                          {t.profile.otpHintLabel}:{' '}
                          <strong className="font-mono-tabular text-sm">{demoOtpHint}</strong>
                        </div>
                      )}
                      <div className="flex flex-wrap items-end gap-2.5">
                        <div className="flex-1 min-w-[160px]">
                          <label htmlFor="quick-otp" className="block text-xs font-medium text-slate-600 mb-1">
                            {t.profile.otpLabel}
                          </label>
                          <input
                            id="quick-otp"
                            type="text"
                            maxLength={6}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="6-digit OTP"
                            className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={authLoading}
                          onClick={async () => {
                            setAuthError(null);
                            setAuthLoading(true);
                            try {
                              await onQuickVerifyOtp(mobile, otpInput);
                            } catch (err) {
                              setAuthError((err as Error).message);
                            } finally {
                              setAuthLoading(false);
                            }
                          }}
                          className="h-10 px-4 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg whitespace-nowrap"
                        >
                          {t.profile.verifyLoginBtn}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {authError && <p className="text-xs text-red-700 font-medium">{authError}</p>}
            </section>
          )}

          {subStep === 'passengers' ? (
            <form
              onSubmit={handleContinueToPayment}
              className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
            >
              <h1 className="text-lg font-bold text-slate-900">{t.booking.stepPassengers}</h1>

              <div className="space-y-4">
                {passengers.map((passenger, idx) => (
                  <div
                    key={passenger.seatNumber}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
                      <span>
                        {t.common.passenger} {idx + 1}
                      </span>
                      <span className="font-mono-tabular text-blue-700">
                        {coach.coachCode} · {t.common.seat} {passenger.seatNumber} (
                        {passenger.berthType})
                      </span>
                    </div>

                    {savedPassengers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                          <UserPlus className="w-3 h-3" /> Quick-fill:
                        </span>
                        {savedPassengers.map((sp) => (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => applySavedPassenger(idx, sp)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                          >
                            {sp.fullName} ({sp.age})
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6">
                        <label
                          htmlFor={`pax-name-${idx}`}
                          className="block text-xs font-medium text-slate-600 mb-1"
                        >
                          {t.booking.fullName}
                        </label>
                        <input
                          id={`pax-name-${idx}`}
                          type="text"
                          required
                          value={passenger.fullName}
                          onChange={(e) => updatePassenger(idx, 'fullName', e.target.value)}
                          placeholder="e.g. Karthik Reddy"
                          className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label
                          htmlFor={`pax-age-${idx}`}
                          className="block text-xs font-medium text-slate-600 mb-1"
                        >
                          {t.booking.age}
                        </label>
                        <input
                          id={`pax-age-${idx}`}
                          type="number"
                          min={1}
                          max={115}
                          required
                          value={passenger.age}
                          onChange={(e) => updatePassenger(idx, 'age', e.target.value)}
                          placeholder="28"
                          className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg font-mono-tabular focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label
                          htmlFor={`pax-gender-${idx}`}
                          className="block text-xs font-medium text-slate-600 mb-1"
                        >
                          {t.booking.gender}
                        </label>
                        <select
                          id={`pax-gender-${idx}`}
                          value={passenger.gender}
                          onChange={(e) =>
                            updatePassenger(
                              idx,
                              'gender',
                              e.target.value as PassengerInput['gender']
                            )
                          }
                          className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="Male">{t.booking.male}</option>
                          <option value="Female">{t.booking.female}</option>
                          <option value="Other">{t.booking.other}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {validationError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium"
                >
                  {validationError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancelHold}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  {t.booking.releaseHoldCancel}
                </button>
                <button
                  type="submit"
                  data-testid="proceed-payment-btn"
                  className="px-6 py-3 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors"
                >
                  {t.booking.proceedToPayment}
                </button>
              </div>
            </form>
          ) : (
            /* PAYMENT GATEWAY */
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900">{t.booking.paymentTitle}</h1>
                <p className="text-xs text-slate-600 mt-0.5">{t.booking.paymentSubtitle}</p>
              </div>

              {paymentFeedback?.type === 'FAILED' && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-bold text-red-900">{t.booking.paymentFailedTitle}</div>
                    <p className="text-red-700 mt-0.5">{t.booking.paymentFailedDesc}</p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                {razorpayConfigured && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('RAZORPAY')}
                    className={`sm:col-span-2 p-3.5 rounded-xl border-2 text-left flex items-center justify-between gap-3 transition-colors ${
                      paymentMethod === 'RAZORPAY'
                        ? 'border-blue-700 bg-blue-50/60 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                      <div>
                        <div className="text-sm font-bold">Razorpay Live / Test Gateway</div>
                        <div className="text-xs text-slate-500">
                          UPI, Cards, Netbanking verified via server HMAC signature
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">Configured</span>
                  </button>
                )}

                {(
                  [
                    { id: 'UPI', label: 'UPI ID (Sandbox)', icon: Wallet },
                    { id: 'PHONEPE', label: 'PhonePe (Sandbox)', icon: Smartphone },
                    { id: 'GPAY', label: 'Google Pay (Sandbox)', icon: Smartphone },
                    { id: 'CARD', label: 'Debit / Credit Card (Sandbox)', icon: CreditCard },
                  ] as const
                ).map((method) => {
                  const Icon = method.icon;
                  const active = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${
                        active
                          ? 'border-blue-700 bg-blue-50/60 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-blue-700 shrink-0" />
                      <span className="text-sm font-semibold">{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {paymentMethod !== 'CARD' && paymentMethod !== 'RAZORPAY' && (
                <div>
                  <label htmlFor="demo-upi" className="block text-xs font-medium text-slate-600 mb-1">
                    Sandbox UPI Handle
                  </label>
                  <input
                    id="demo-upi"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div>
                  <label htmlFor="demo-card" className="block text-xs font-medium text-slate-600 mb-1">
                    Test Card Reference Digits (Sandbox only)
                  </label>
                  <input
                    id="demo-card"
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
              )}

              {validationError && (
                <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {validationError}
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>
                    {paymentMethod === 'RAZORPAY'
                      ? 'Proceed to Razorpay Verified Payment Modal'
                      : t.booking.simulateOutcomeTitle}
                  </span>
                </div>

                {paymentMethod === 'RAZORPAY' ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handlePaymentAction('SUCCESS')}
                    className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-bold transition-colors"
                  >
                    {isSubmitting ? t.common.loading : `Pay ₹${fare.totalFare} via Razorpay`}
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handlePaymentAction('SUCCESS')}
                      data-testid="pay-success-btn"
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-bold transition-colors"
                    >
                      {isSubmitting ? t.common.loading : t.booking.paySuccessBtn}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handlePaymentAction('PENDING')}
                      data-testid="pay-pending-btn"
                      className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-bold transition-colors"
                    >
                      {t.booking.payPendingBtn}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handlePaymentAction('FAILED')}
                      data-testid="pay-fail-btn"
                      className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-bold transition-colors"
                    >
                      {t.booking.payFailBtn}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Sticky Fare Summary */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">{t.booking.fareSummaryTitle}</h2>
            <span className="text-xs font-semibold text-blue-700">{t.common.demoFareBadge}</span>
          </div>

          <div className="space-y-2 text-sm border-b border-slate-100 pb-4">
            <div className="flex justify-between text-slate-600">
              <span>{t.booking.baseFare}</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                ₹{fare.baseTicketFare} × {fare.passengerCount}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t.booking.reservationCharge}</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                ₹{fare.reservationFee} × {fare.passengerCount}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t.booking.gstDemo}</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                ₹{fare.gstAmount} × {fare.passengerCount}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">{t.trainMap.totalDemoFare}</span>
            <span className="font-mono-tabular text-2xl font-bold text-blue-700">
              ₹{fare.totalFare}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">{t.common.demoNotice}</p>
        </aside>
      </div>
    </main>
  );
};
