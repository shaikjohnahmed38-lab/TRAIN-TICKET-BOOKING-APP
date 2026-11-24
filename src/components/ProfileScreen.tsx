import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  Plus,
  Shield,
  Smartphone,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { railwayAdapter } from '../services/railwayAdapter';
import type { CustomerUser, SavedPassenger, UserSessionInfo } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface ProfileScreenProps {
  user: CustomerUser | null;
  authToken: string | null;
  savedPassengers: SavedPassenger[];
  onRefreshSavedPassengers: () => Promise<void>;
  onRegister: (params: {
    name: string;
    email: string;
    mobile: string;
    password: string;
  }) => Promise<{ sandboxCode?: string; mode: 'SMTP' | 'UNCONFIGURED' }>;
  onLoginPassword: (identifier: string, password: string) => Promise<void>;
  onRequestOtp: (mobile: string) => Promise<{
    hint?: string;
    deliveryMode: 'TWILIO' | 'SANDBOX';
    disclaimer: string;
  }>;
  onVerifyOtp: (mobile: string, otp: string) => Promise<void>;
  onUpdateProfile: (updates: {
    name: string;
    email: string;
    age: number | null;
    gender: 'Male' | 'Female' | 'Other' | null;
  }) => Promise<void>;
  onRefreshUser: () => Promise<void>;
  onLogout: () => Promise<void>;
  onAccountDeleted: () => void;
  onOpenAdmin: () => void;
  t: TranslationDictionary;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  authToken,
  savedPassengers,
  onRefreshSavedPassengers,
  onRegister,
  onLoginPassword,
  onRequestOtp,
  onVerifyOtp,
  onUpdateProfile,
  onRefreshUser,
  onLogout,
  onAccountDeleted,
  onOpenAdmin,
  t,
}) => {
  // Logged-out auth tabs
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'otp'>('login');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Password login + forgot password state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState<'none' | 'request' | 'confirm'>('none');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [sandboxResetCode, setSandboxResetCode] = useState<string | null>(null);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // OTP state
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpDeliveryMode, setOtpDeliveryMode] = useState<'TWILIO' | 'SANDBOX'>('SANDBOX');

  // Logged-in profile state (synced whenever user changes)
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(user?.gender ?? 'Male');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Email verification
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sandboxVerifyCode, setSandboxVerifyCode] = useState<string | null>(null);

  // Saved co-travellers form
  const [coName, setCoName] = useState('');
  const [coAge, setCoAge] = useState('');
  const [coGender, setCoGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [coBerth, setCoBerth] = useState('LB');

  // Change password & sessions & delete account
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setAge(user?.age ? String(user.age) : '');
    setGender(user?.gender ?? 'Male');
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }
    railwayAdapter
      .listSessions(authToken)
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [user, authToken]);

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 pb-24 space-y-4">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t.profile.loginTitle}</h1>
            <p className="text-xs text-slate-600 mt-1">{t.profile.loginSubtitle}</p>
          </div>

          {/* Auth Tabs */}
          <div
            role="tablist"
            aria-label="Authentication methods"
            className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl border border-slate-200"
          >
            {(
              [
                { id: 'login', label: 'Sign In' },
                { id: 'register', label: 'Register' },
                { id: 'otp', label: 'Mobile OTP' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={authTab === tab.id}
                onClick={() => {
                  setAuthTab(tab.id);
                  setErrorMsg(null);
                  setInfoMsg(null);
                  setForgotMode('none');
                }}
                data-testid={`auth-tab-${tab.id}`}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                  authTab === tab.id
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {authTab === 'login' && forgotMode === 'none' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErrorMsg(null);
                setInfoMsg(null);
                setBusy(true);
                try {
                  await onLoginPassword(identifier, password);
                } catch (err) {
                  setErrorMsg((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="login-identifier" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Email or 10-Digit Mobile
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or 9876543210"
                  className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-600">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode('request');
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                data-testid="password-login-btn"
                className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-bold transition-colors"
              >
                {busy ? t.common.loading : 'Sign In'}
              </button>
            </form>
          )}

          {authTab === 'login' && forgotMode !== 'none' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Reset Password</h2>
                <button
                  type="button"
                  onClick={() => setForgotMode('none')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Back to Sign In
                </button>
              </div>

              {forgotMode === 'request' ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setErrorMsg(null);
                    setBusy(true);
                    try {
                      const res = await railwayAdapter.requestPasswordReset(resetEmail);
                      setSandboxResetCode(res.sandboxResetCode ?? null);
                      setForgotMode('confirm');
                      setInfoMsg(
                        res.deliveryMode === 'SMTP'
                          ? 'Reset code sent to your email address.'
                          : 'SMTP not configured — use the sandbox reset code below.'
                      );
                    } catch (err) {
                      setErrorMsg((err as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-600 mb-1">
                      Registered Email Address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                  >
                    {busy ? t.common.loading : 'Send Reset Code'}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setErrorMsg(null);
                    setBusy(true);
                    try {
                      await railwayAdapter.resetPassword({
                        email: resetEmail,
                        code: resetCode,
                        newPassword: resetNewPassword,
                      });
                      setForgotMode('none');
                      setInfoMsg('Password reset complete. You can sign in now.');
                    } catch (err) {
                      setErrorMsg((err as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="space-y-3"
                >
                  {sandboxResetCode && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      Sandbox Reset Code (SMTP unconfigured):{' '}
                      <strong className="font-mono-tabular">{sandboxResetCode}</strong>
                    </div>
                  )}
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="6-digit reset code"
                    className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl font-mono-tabular"
                  />
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="New password (min 8 chars, letters + numbers)"
                    className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold"
                  >
                    {busy ? t.common.loading : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          )}

          {authTab === 'register' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErrorMsg(null);
                setInfoMsg(null);
                setBusy(true);
                try {
                  const res = await onRegister({
                    name: regName,
                    email: regEmail,
                    mobile: regMobile,
                    password: regPassword,
                  });
                  if (res.sandboxCode) {
                    setSandboxVerifyCode(res.sandboxCode);
                    setVerifyOpen(true);
                  }
                } catch (err) {
                  setErrorMsg((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.profile.nameLabel}
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.profile.emailLabel}
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="reg-mobile" className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.profile.mobileLabel}
                </label>
                <input
                  id="reg-mobile"
                  type="tel"
                  maxLength={10}
                  required
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-600 mb-1">
                  Password (8+ chars, letters &amp; numbers)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                data-testid="register-submit-btn"
                className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-bold transition-colors"
              >
                {busy ? t.common.loading : 'Create Account'}
              </button>
            </form>
          )}

          {authTab === 'otp' && (
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
                    const res = await onRequestOtp(mobile);
                    setOtpHint(res.hint ?? null);
                    setOtpDeliveryMode(res.deliveryMode);
                    setOtpRequested(true);
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

              {otpRequested && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {otpHint ? (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                      {t.profile.otpHintLabel}:{' '}
                      <strong data-testid="demo-otp-hint" className="font-mono-tabular text-sm">
                        {otpHint}
                      </strong>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                      SMS OTP sent via {otpDeliveryMode}. Enter the 6-digit code received on +91 {mobile}.
                    </div>
                  )}

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

              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>{t.profile.demoAuthDisclaimer}</span>
              </p>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              {infoMsg}
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">System Administrator?</span>
            <button
              type="button"
              onClick={onOpenAdmin}
              data-testid="open-admin-portal-link"
              className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Open Admin Portal</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 space-y-6">
      {/* Account Summary & Verification */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
                <span className="text-[11px] font-mono-tabular font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {user.role ?? 'customer'}
                </span>
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700">Unverified Email</span>
                )}
              </div>
              <p className="text-xs font-mono-tabular text-slate-600 mt-0.5">
                +91 {user.mobile}
                {user.email ? ` · ${user.email}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(user.role === 'admin' || user.role === 'operator') && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              data-testid="logout-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.profile.logoutBtn}</span>
            </button>
          </div>
        </div>

        {/* Inline Email Verification when unverified and email is present */}
        {!user.isVerified && user.email && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-amber-900 flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span>Verify your email ({user.email}) for account recovery and e-ticket receipts.</span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setErrorMsg(null);
                  try {
                    const res = await railwayAdapter.requestEmailVerification(authToken);
                    setVerifyOpen(true);
                    setSandboxVerifyCode(res.sandboxCode ?? null);
                  } catch (err) {
                    setErrorMsg((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded-lg"
              >
                Send Verification Code
              </button>
            </div>

            {verifyOpen && (
              <div className="space-y-2 pt-2 border-t border-amber-200/80">
                {sandboxVerifyCode && (
                  <p className="text-xs text-amber-900">
                    Sandbox Code (SMTP unconfigured):{' '}
                    <strong className="font-mono-tabular">{sandboxVerifyCode}</strong>
                  </p>
                )}
                <div className="flex gap-2 max-w-xs">
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="6-digit code"
                    className="flex-1 h-9 px-3 text-xs bg-white border border-amber-300 rounded-lg font-mono-tabular"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setErrorMsg(null);
                      try {
                        await railwayAdapter.confirmEmailVerification(verifyCode, authToken);
                        await onRefreshUser();
                        setVerifyOpen(false);
                      } catch (err) {
                        setErrorMsg((err as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="px-3 h-9 text-xs font-bold bg-blue-700 text-white rounded-lg"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Edit Form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setSavedNotice(null);
            setErrorMsg(null);
            try {
              await onUpdateProfile({
                name,
                email,
                age: age ? Number(age) : null,
                gender,
              });
              setSavedNotice('Profile updated successfully.');
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

          {savedNotice && <p className="text-xs font-semibold text-emerald-700">{savedNotice}</p>}
          {errorMsg && <p className="text-xs font-semibold text-red-700">{errorMsg}</p>}

          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
          >
            {t.profile.saveProfileBtn}
          </button>
        </form>
      </section>

      {/* Saved Co-Travellers */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-700" />
          <span>Saved Co-Travellers ({savedPassengers.length})</span>
        </h2>

        {savedPassengers.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {savedPassengers.map((sp) => (
              <div key={sp.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-semibold text-slate-900">{sp.fullName}</span>
                  <span className="text-xs text-slate-500 ml-2 font-mono-tabular">
                    {sp.age} yrs · {sp.gender}
                    {sp.berthPreference ? ` · Pref: ${sp.berthPreference}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await railwayAdapter.deleteSavedPassenger(sp.id, authToken);
                    await onRefreshSavedPassengers();
                  }}
                  aria-label={`Remove ${sp.fullName}`}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Add frequent passengers for 1-click checkout autofill.</p>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!coName.trim() || !coAge) return;
            await railwayAdapter.addSavedPassenger(
              {
                fullName: coName.trim(),
                age: Number(coAge),
                gender: coGender,
                berthPreference: coBerth,
              },
              authToken
            );
            setCoName('');
            setCoAge('');
            await onRefreshSavedPassengers();
          }}
          className="grid sm:grid-cols-12 gap-2.5 pt-2"
        >
          <input
            type="text"
            required
            placeholder="Co-traveller name"
            value={coName}
            onChange={(e) => setCoName(e.target.value)}
            className="sm:col-span-5 h-9 px-3 text-xs border border-slate-300 rounded-lg"
          />
          <input
            type="number"
            required
            min={1}
            max={115}
            placeholder="Age"
            value={coAge}
            onChange={(e) => setCoAge(e.target.value)}
            className="sm:col-span-2 h-9 px-3 text-xs border border-slate-300 rounded-lg font-mono-tabular"
          />
          <select
            value={coGender}
            onChange={(e) => setCoGender(e.target.value as 'Male' | 'Female' | 'Other')}
            className="sm:col-span-2 h-9 px-2 text-xs border border-slate-300 rounded-lg"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={coBerth}
            onChange={(e) => setCoBerth(e.target.value)}
            className="sm:col-span-1 h-9 px-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
          >
            <option value="LB">LB</option>
            <option value="MB">MB</option>
            <option value="UB">UB</option>
            <option value="SL">SL</option>
            <option value="SU">SU</option>
          </select>
          <button
            type="submit"
            className="sm:col-span-2 h-9 inline-flex items-center justify-center gap-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      </section>

      {/* Security: Password & Active Sessions */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-700" />
            <span>{user.hasPassword ? 'Change Password' : 'Set Account Password'}</span>
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPwNotice(null);
              setErrorMsg(null);
              try {
                await railwayAdapter.changePassword(
                  { currentPassword: currentPw || undefined, newPassword: newPw },
                  authToken
                );
                setCurrentPw('');
                setNewPw('');
                setPwNotice('Password updated.');
                await onRefreshUser();
              } catch (err) {
                setErrorMsg((err as Error).message);
              }
            }}
            className="space-y-3"
          >
            {user.hasPassword && (
              <input
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Current password"
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
              />
            )}
            <input
              type="password"
              required
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (8+ chars, letters + numbers)"
              className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
            />
            {pwNotice && <p className="text-xs font-semibold text-emerald-700">{pwNotice}</p>}
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              Update Password
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-700" />
            <span>Active Sessions ({sessions.length})</span>
          </h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {s.isCurrent ? 'Current Session' : 'Other Device'} · {s.ipAddress}
                  </div>
                  <div className="text-slate-500 truncate">{s.userAgent || 'Browser'}</div>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={async () => {
                      await railwayAdapter.revokeSession(s.id, authToken);
                      const next = await railwayAdapter.listSessions(authToken);
                      setSessions(next);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg shrink-0"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Danger Zone: Account Deletion */}
      <section className="bg-white border border-red-200 rounded-2xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-red-900">Delete Account</h2>
            <p className="text-xs text-slate-600">
              Permanently deletes your profile, saved co-travellers, and active sessions.
            </p>
          </div>
          {!deleteConfirmOpen && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
            >
              Delete Account
            </button>
          )}
        </div>

        {deleteConfirmOpen && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-100">
            {user.hasPassword && (
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Confirm your password"
                className="h-9 px-3 text-xs border border-red-300 rounded-lg"
              />
            )}
            <button
              type="button"
              onClick={async () => {
                setErrorMsg(null);
                try {
                  await railwayAdapter.deleteAccount(deletePassword, authToken);
                  onAccountDeleted();
                } catch (err) {
                  setErrorMsg((err as Error).message);
                }
              }}
              className="h-9 px-3.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Confirm Permanent Deletion
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-9 px-3 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
