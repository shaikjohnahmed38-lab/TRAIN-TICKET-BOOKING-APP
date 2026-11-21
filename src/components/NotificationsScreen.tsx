import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type { Language, NotificationItem } from '../types/railway';
import type { TranslationDictionary } from '../i18n/translations';

interface NotificationsScreenProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => Promise<void>;
  language: Language;
  t: TranslationDictionary;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  onMarkAllRead,
  language,
  t,
}) => {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.notifications.title}</h1>
          <p className="text-sm text-slate-600 mt-0.5">{t.notifications.subtitle}</p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{t.notifications.markAllRead}</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <Bell className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm text-slate-600">{t.notifications.empty}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 ${
                item.read ? 'bg-white' : 'bg-blue-50/40'
              }`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-amber-800">
                    {t.notifications.simulatedBadge}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono-tabular text-slate-500">
                    {new Date(item.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  {language === 'te' ? item.titleTe : item.titleEn}
                </h2>
                <p className="text-sm text-slate-600">
                  {language === 'te' ? item.messageTe : item.messageEn}
                </p>
              </div>
              {!item.read && (
                <span className="text-xs font-semibold text-blue-700 shrink-0">New</span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
};
