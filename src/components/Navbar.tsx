import React from 'react';
import { Bell, Search, Settings, Ticket, User } from 'lucide-react';
import type { AppScreen, CustomerUser, Language } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface NavbarProps {
  appName: string;
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  user: CustomerUser | null;
  unreadNotifications: number;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  t: TranslationDictionary;
}

export const Navbar: React.FC<NavbarProps> = ({
  appName,
  activeScreen,
  onNavigate,
  user,
  unreadNotifications,
  language,
  onLanguageChange,
  t,
}) => {
  const isSearchFlow =
    activeScreen === 'home' ||
    activeScreen === 'search' ||
    activeScreen === 'results' ||
    activeScreen === 'train-map' ||
    activeScreen === 'booking-flow' ||
    activeScreen === 'confirmation';

  return (
    <>
      {/* Desktop & Mobile Top Header (Single row, 3-zone contract on desktop) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-13 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-line configurable Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-base md:text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
          >
            {appName}
          </button>

          {/* Zone 2: 4 clean single-line text navigation links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                isSearchFlow
                  ? 'border-blue-700 text-blue-700 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {t.nav.searchTrains}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('my-bookings')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeScreen === 'my-bookings'
                  ? 'border-blue-700 text-blue-700 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {t.nav.myBookings}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeScreen === 'notifications'
                  ? 'border-blue-700 text-blue-700 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {t.nav.notifications}
              {unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeScreen === 'settings'
                  ? 'border-blue-700 text-blue-700 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {t.nav.settings}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action (Desktop) / Compact Language + Settings (Mobile) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onLanguageChange(language === 'en' ? 'te' : 'en')}
              aria-label="Toggle language between English and Telugu"
              className="md:hidden px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {language === 'en' ? 'తెలుగు' : 'EN'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label={t.nav.settings}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <User className="w-4 h-4" />
              <span>{user ? user.name : t.nav.login}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-zone ergonomic navigation) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 h-14"
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            isSearchFlow ? 'text-blue-700' : 'text-slate-600'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="truncate max-w-[76px]">{t.nav.searchTrains}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('my-bookings')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeScreen === 'my-bookings' ? 'text-blue-700' : 'text-slate-600'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span className="truncate max-w-[76px]">{t.nav.myBookings}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeScreen === 'notifications' ? 'text-blue-700' : 'text-slate-600'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="whitespace-nowrap">
            {language === 'te' ? 'అలర్ట్స్' : 'Alerts'}
            {unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeScreen === 'profile' ? 'text-blue-700' : 'text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="truncate max-w-[76px]">{t.nav.profile}</span>
        </button>
      </nav>
    </>
  );
};
