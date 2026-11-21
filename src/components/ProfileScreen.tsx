import React, { useState } from 'react';
import { LogOut, Smartphone, User } from 'lucide-react';
import type { CustomerUser } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface ProfileScreenProps {
  user: CustomerUser | null;
  onRequestOtp: (mobile: string) => Promise<string>;
  onVerifyOtp: (mobile: string, otp: string) => Promise<void>;
  onUpdateProfile: (updates: {
    name: string;
    email: string;
    age: number | null;
    gender: 'Male' | 'Female' | 'Other' | null;
  }) => Promise<void>;
  onLogout: () => Promise<void>;
  t: TranslationDictionary;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onRequestOtp,
  onVerifyOtp,
  onUpdateProfile,
  onLogout,
  t,
}) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [demoHint, setDemoHint] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(
    user?.gender ?? 'Male'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 pb-24">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t.profile.loginTitle}</h1>
              <p className="text-xs text-slate-600">{t.profile.loginSubtitle}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="login-mobile" className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t.profile.mobileLabel}
              </label>
              <input
                id="login-mobile"
                type="tel"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={t.profile.mobilePlaceholder}
                className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl font-mono-tabular focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setErrorMsg(null);
                setBusy(true);
                try {
                  const code = await onRequestOtp(mobile);
                  setDemoHint(code);
                } catch (err) {
                  setErrorMsg((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              data-testid="request-otp-btn"
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
            >
              {t.profile.sendOtpBtn}
            </button>

            {demoHint && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  {t.profile.otpHintLabel}:{' '}
                  <strong data-testid="demo-otp-hint" className="font-mono-tabular text-sm">
                    {demoHint}
                  </strong>
                </div>

                <div>
                  <label htmlFor="login-otp" className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {t.profile.otpLabel}
                  </label>
                  <input
                    id="login-otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl font-mono-tabular focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setErrorMsg(null);
                    setBusy(true);
                    try {
                      await onVerifyOtp(mobile, otp);
                    } catch (err) {
                      setErrorMsg((err as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  data-testid="verify-otp-btn"
                  className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold transition-colors"
                >
                  {t.profile.verifyLoginBtn}
                </button>
              </div>
            )}

            {errorMsg && (
              <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-slate-500">{t.profile.demoAuthDisclaimer}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
              <p className="text-xs font-mono-tabular text-slate-600">+91 {user.mobile}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.profile.logoutBtn}</span>
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setSavedNotice(false);
            try {
              await onUpdateProfile({
                name,
                email,
                age: age ? Number(age) : null,
                gender,
              });
              setSavedNotice(true);
            } catch (err) {
              setErrorMsg((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-600 mb-1">
                {t.profile.nameLabel}
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="prof-email" className="block text-xs font-semibold text-slate-600 mb-1">
                {t.profile.emailLabel}
              </label>
              <input
                id="prof-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="prof-age" className="block text-xs font-semibold text-slate-600 mb-1">
                {t.booking.age}
              </label>
              <input
                id="prof-age"
                type="number"
                min={1}
                max={115}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="prof-gender" className="block text-xs font-semibold text-slate-600 mb-1">
                {t.booking.gender}
              </label>
              <select
                id="prof-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
              >
                <option value="Male">{t.booking.male}</option>
                <option value="Female">{t.booking.female}</option>
                <option value="Other">{t.booking.other}</option>
              </select>
            </div>
          </div>

          {savedNotice && (
            <p className="text-xs font-semibold text-emerald-700">Profile updated.</p>
          )}
          {errorMsg && (
            <p className="text-xs font-semibold text-red-700">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
          >
            {t.profile.saveProfileBtn}
          </button>
        </form>
      </section>
    </main>
  );
};
