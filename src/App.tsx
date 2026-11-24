import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/Navbar';
import { SearchScreen } from './components/SearchScreen';
import { TrainResultsScreen } from './components/TrainResultsScreen';
import { TrainMap2D } from './components/TrainMap2D';
import { BookingFlowScreen } from './components/BookingFlowScreen';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { MyBookingsScreen } from './components/MyBookingsScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AdminDashboardScreen } from './components/AdminDashboardScreen';
import { DEFAULT_APP_CONFIG } from './config/appConfig';
import { TRANSLATIONS } from './i18n/translations';
import { railwayAdapter } from './services/railwayAdapter';
import { realtimeClient } from './services/realtimeClient';
import { DEFAULT_PRICING_RULES } from './utils/fareCalculator';
import type {
  AppConfigRecord,
  AppScreen,
  BookingRecord,
  CoachSummary,
  CoachType,
  CustomerUser,
  IntegrationStatusMap,
  Language,
  NotificationItem,
  PassengerInput,
  PaymentMethod,
  PricingRule,
  SavedPassenger,
  SeatRecord,
  Station,
  TrainSearchResult,
} from './types/railway';

function getOrCreateVisitorSessionId(): string {
  const key = 'rail_demo_visitor_id';
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const generated = `VIS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    window.localStorage.setItem(key, generated);
    return generated;
  } catch {
    return 'VIS-SESSION';
  }
}

function getDefaultJourneyDate(): string {
  const d = new Date(Date.now() + 2 * 86400_000);
  return d.toISOString().slice(0, 10);
}

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function App() {
  const [sessionId] = useState<string>(() => getOrCreateVisitorSessionId());
  const [language, setLanguage] = useState<Language>('en');
  const [appConfig, setAppConfig] = useState<AppConfigRecord>({
    appName: DEFAULT_APP_CONFIG.appNamePlaceholder,
    supportEmail: DEFAULT_APP_CONFIG.supportEmail,
    holdDurationMinutes: DEFAULT_APP_CONFIG.seatHoldDurationMinutes,
    maxSeatsPerBooking: DEFAULT_APP_CONFIG.maxSeatsPerBooking,
    maintenanceMode: DEFAULT_APP_CONFIG.maintenanceMode,
  });
  const [integrations, setIntegrations] = useState<IntegrationStatusMap | null>(null);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');

  const [stations, setStations] = useState<Station[]>([]);
  const [pricingRules, setPricingRules] = useState<Record<CoachType, PricingRule>>(
    DEFAULT_PRICING_RULES
  );

  // Auth state (Bearer held strictly in React memory + HttpOnly session cookie on server)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [savedPassengers, setSavedPassengers] = useState<SavedPassenger[]>([]);

  // Search state
  const [fromCode, setFromCode] = useState('SC');
  const [toCode, setToCode] = useState('VSKP');
  const [journeyDate, setJourneyDate] = useState<string>(() => getDefaultJourneyDate());
  const [timeWindow, setTimeWindow] = useState('ALL');
  const [searchResults, setSearchResults] = useState<TrainSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Active Train / Coach / 2D Map state
  const [selectedTrain, setSelectedTrain] = useState<TrainSearchResult | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<CoachSummary | null>(null);
  const [coachSeats, setCoachSeats] = useState<SeatRecord[]>([]);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<number[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);

  // Booking / Confirmation / History / Notifications state
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const t = useMemo(() => TRANSLATIONS[language], [language]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const refreshBookingsAndNotifications = useCallback(async () => {
    try {
      const [bList, nList] = await Promise.all([
        railwayAdapter.listBookings({ sessionId }, authToken),
        railwayAdapter.listNotifications(sessionId, authToken),
      ]);
      setBookings(bList);
      setNotifications(nList);
    } catch {
      // Keep current lists if transient error
    }
  }, [sessionId, authToken]);

  const refreshSavedPassengers = useCallback(async () => {
    if (!user) {
      setSavedPassengers([]);
      return;
    }
    try {
      const list = await railwayAdapter.listSavedPassengers(authToken);
      setSavedPassengers(list);
    } catch {
      setSavedPassengers([]);
    }
  }, [user, authToken]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [stList, pricing, me, cfg, integ] = await Promise.all([
          railwayAdapter.listStations(),
          railwayAdapter.getPricingRules(),
          railwayAdapter.getCurrentUser(null),
          railwayAdapter.getAppConfig(),
          railwayAdapter.getIntegrationStatuses(),
        ]);
        if (!mounted) return;
        setStations(stList);
        setPricingRules(pricing);
        setAppConfig(cfg);
        setIntegrations(integ);
        if (me.user) setUser(me.user);
      } catch {
        // Fallback defaults already set
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    refreshBookingsAndNotifications();
  }, [refreshBookingsAndNotifications]);

  useEffect(() => {
    refreshSavedPassengers();
  }, [refreshSavedPassengers]);

  // Real-time WebSocket connection & live updates
  useEffect(() => {
    realtimeClient.connect(sessionId, authToken);
    const unsub = realtimeClient.onEvent((event) => {
      if (event.type === 'coach_update') {
        if (
          activeScreen === 'train-map' &&
          selectedTrain?.id === event.trainId &&
          selectedCoach?.id === event.coachId &&
          selectedTrain.journeyDate === event.journeyDate
        ) {
          railwayAdapter
            .getCoachSeats({
              trainId: event.trainId,
              coachId: event.coachId,
              journeyDate: event.journeyDate,
            })
            .then(setCoachSeats)
            .catch(() => {});
        }
      } else if (
        event.type === 'notification:new' ||
        event.type === 'booking:created' ||
        event.type === 'booking:updated'
      ) {
        refreshBookingsAndNotifications();
      } else if (event.type === 'config_updated' && event.config) {
        setAppConfig(event.config as AppConfigRecord);
      }
    });
    return () => {
      unsub();
    };
  }, [
    sessionId,
    authToken,
    activeScreen,
    selectedTrain,
    selectedCoach,
    refreshBookingsAndNotifications,
  ]);

  useEffect(() => {
    if (activeScreen === 'train-map' && selectedTrain && selectedCoach) {
      realtimeClient.subscribeCoach(
        selectedTrain.id,
        selectedCoach.id,
        selectedTrain.journeyDate
      );
    } else {
      realtimeClient.unsubscribeCoach();
    }
  }, [activeScreen, selectedTrain, selectedCoach]);

  const handleSearchTrains = async () => {
    setSearchError(null);
    if (!fromCode || !toCode) {
      setSearchError('Please select both From and To stations.');
      return;
    }
    if (fromCode === toCode) {
      setSearchError('From and To stations must be different.');
      return;
    }
    setIsSearching(true);
    try {
      const results = await railwayAdapter.searchTrains({
        fromCode,
        toCode,
        journeyDate,
        timeWindow,
      });
      setSearchResults(results);
      setActiveScreen('results');
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setIsSearching(false);
    }
  };

  const loadSeatsForCoach = async (
    train: TrainSearchResult,
    coach: CoachSummary
  ) => {
    setIsLoadingSeats(true);
    setMapError(null);
    setSelectedCoach(coach);
    setSelectedSeatNumbers([]);
    try {
      const seats = await railwayAdapter.getCoachSeats({
        trainId: train.id,
        coachId: coach.id,
        journeyDate: train.journeyDate,
      });
      setCoachSeats(seats);
    } catch (err) {
      setMapError((err as Error).message);
    } finally {
      setIsLoadingSeats(false);
    }
  };

  const handleOpenTrainMap = async (train: TrainSearchResult, coachId?: string) => {
    const initialCoach =
      (coachId ? train.coaches.find((c) => c.id === coachId) : null) ??
      train.coaches.find((c) => c.coachType === 'SL') ??
      train.coaches[0];

    setSelectedTrain(train);
    setActiveScreen('train-map');
    if (initialCoach) {
      await loadSeatsForCoach(train, initialCoach);
    }
  };

  const handleToggleSeat = (seat: SeatRecord) => {
    setMapError(null);
    setSelectedSeatNumbers((prev) => {
      if (prev.includes(seat.seatNumber)) {
        return prev.filter((n) => n !== seat.seatNumber);
      }
      if (prev.length >= appConfig.maxSeatsPerBooking) {
        setMapError(t.trainMap.maxSeatsNotice);
        return prev;
      }
      return [...prev, seat.seatNumber].sort((a, b) => a - b);
    });
  };

  const handleHoldAndProceed = async () => {
    if (!selectedTrain || !selectedCoach || selectedSeatNumbers.length === 0) return;
    setIsHolding(true);
    setMapError(null);
    try {
      const hasWl = coachSeats
        .filter((s) => selectedSeatNumbers.includes(s.seatNumber))
        .some((s) => s.status === 'WAITING_LIST');

      const res = await railwayAdapter.holdSeats({
        sessionId,
        trainId: selectedTrain.id,
        coachId: selectedCoach.id,
        journeyDate: selectedTrain.journeyDate,
        seatNumbers: selectedSeatNumbers,
        allowWaitlist: hasWl,
      });
      setCoachSeats(res.seats);
      setHoldExpiresAt(res.holdExpiresAt);
      setActiveScreen('booking-flow');
    } catch (err) {
      setMapError((err as Error).message);
      await loadSeatsForCoach(selectedTrain, selectedCoach);
    } finally {
      setIsHolding(false);
    }
  };

  const handleReleaseHoldAndBack = async () => {
    if (selectedTrain && selectedCoach) {
      try {
        await railwayAdapter.releaseHold({
          sessionId,
          trainId: selectedTrain.id,
          coachId: selectedCoach.id,
          journeyDate: selectedTrain.journeyDate,
          seatNumbers: selectedSeatNumbers,
        });
      } catch {
        // Ignore release errors on navigation back
      }
      await loadSeatsForCoach(selectedTrain, selectedCoach);
    }
    setHoldExpiresAt(null);
    setActiveScreen('train-map');
  };

  const handleCompletePayment = async (params: {
    passengers: PassengerInput[];
    paymentMethod: PaymentMethod;
    outcome: 'SUCCESS' | 'PENDING' | 'FAILED';
    existingPnr?: string;
  }): Promise<{ pnr: string; status: string }> => {
    if (!selectedTrain || !selectedCoach) {
      throw new Error('Missing train or coach context.');
    }

    const res = await railwayAdapter.createBookingAndSimulatePayment(
      {
        sessionId,
        trainId: selectedTrain.id,
        coachId: selectedCoach.id,
        fromCode: selectedTrain.fromStation.code,
        toCode: selectedTrain.toStation.code,
        journeyDate: selectedTrain.journeyDate,
        seatNumbers: selectedSeatNumbers,
        passengers: params.passengers,
        paymentMethod: params.paymentMethod,
        outcome: params.outcome,
        existingPnr: params.existingPnr,
      },
      authToken
    );

    await refreshBookingsAndNotifications();

    if (params.outcome === 'SUCCESS' || params.outcome === 'PENDING') {
      setConfirmedBooking(res.booking);
      setHoldExpiresAt(null);
      setSelectedSeatNumbers([]);
      setActiveScreen('confirmation');
    }

    return { pnr: res.booking.pnr, status: res.booking.status };
  };

  const handleRazorpayCheckout = async (params: {
    passengers: PassengerInput[];
    existingPnr?: string;
  }): Promise<void> => {
    if (!selectedTrain || !selectedCoach) {
      throw new Error('Missing train or coach context.');
    }
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error('Unable to load Razorpay Checkout script.');
    }

    // Create pending booking first, then open Razorpay order
    const pending = await railwayAdapter.createBookingAndSimulatePayment(
      {
        sessionId,
        trainId: selectedTrain.id,
        coachId: selectedCoach.id,
        fromCode: selectedTrain.fromStation.code,
        toCode: selectedTrain.toStation.code,
        journeyDate: selectedTrain.journeyDate,
        seatNumbers: selectedSeatNumbers,
        passengers: params.passengers,
        paymentMethod: 'RAZORPAY',
        outcome: 'PENDING',
        existingPnr: params.existingPnr,
      },
      authToken
    );

    const order = await railwayAdapter.createRazorpayOrder(pending.booking.pnr, authToken);

    await new Promise<void>((resolve, reject) => {
      const RazorpayCtor = (
        window as unknown as {
          Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
        }
      ).Razorpay;
      const rzp = new RazorpayCtor({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: appConfig.appName,
        description: `PNR ${pending.booking.pnr} · #${selectedTrain.trainNumber}`,
        order_id: order.orderId,
        prefill: {
          name: user?.name ?? params.passengers[0]?.fullName,
          email: user?.email ?? '',
          contact: user?.mobile ?? '',
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verified = await railwayAdapter.verifyRazorpayPayment(
              {
                pnr: pending.booking.pnr,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                sessionId,
              },
              authToken
            );
            await refreshBookingsAndNotifications();
            setConfirmedBooking(verified.booking);
            setHoldExpiresAt(null);
            setSelectedSeatNumbers([]);
            setActiveScreen('confirmation');
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment modal dismissed.'));
          },
        },
      });
      rzp.open();
    });
  };

  const handleRegister = async (params: {
    name: string;
    email: string;
    mobile: string;
    password: string;
  }) => {
    const res = await railwayAdapter.registerAccount({ ...params, sessionId });
    setAuthToken(res.token);
    setUser(res.user);
    await refreshBookingsAndNotifications();
    return {
      sandboxCode: res.verificationDelivery.sandboxCode,
      mode: res.verificationDelivery.mode,
    };
  };

  const handleLoginPassword = async (identifier: string, password: string) => {
    const res = await railwayAdapter.loginWithPassword({
      identifier,
      password,
      sessionId,
    });
    setAuthToken(res.token);
    setUser(res.user);
    await refreshBookingsAndNotifications();
  };

  const handleRequestOtp = async (mobile: string) => {
    const res = await railwayAdapter.requestDemoOtp(mobile);
    return {
      hint: res.sandboxOtpPreview ?? res.demoOtpHint,
      deliveryMode: res.deliveryMode,
      disclaimer: res.disclaimer,
    };
  };

  const handleVerifyOtp = async (mobile: string, otp: string): Promise<void> => {
    const res = await railwayAdapter.verifyDemoOtp({
      mobile,
      otp,
      sessionId,
    });
    setAuthToken(res.token);
    setUser(res.user);
    await refreshBookingsAndNotifications();
  };

  const handleCancelBooking = async (pnr: string) => {
    await railwayAdapter.cancelBooking(pnr, sessionId, authToken);
    await refreshBookingsAndNotifications();
  };

  const handleAdvanceRefund = async (pnr: string) => {
    await railwayAdapter.advanceRefundSimulation(pnr, sessionId, authToken);
    await refreshBookingsAndNotifications();
  };

  const selectedSeatObjects = useMemo(
    () => coachSeats.filter((s) => selectedSeatNumbers.includes(s.seatNumber)),
    [coachSeats, selectedSeatNumbers]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        appName={appConfig.appName}
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          setActiveScreen(screen);
          if (screen === 'my-bookings' || screen === 'notifications') {
            refreshBookingsAndNotifications();
          }
        }}
        user={user}
        unreadNotifications={unreadCount}
        language={language}
        onLanguageChange={setLanguage}
        t={t}
      />

      {appConfig.maintenanceMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-semibold text-amber-900">
          Scheduled maintenance notice active · Support: {appConfig.supportEmail}
        </div>
      )}

      <div className="flex-1">
        {(activeScreen === 'home' || activeScreen === 'search') && (
          <SearchScreen
            stations={stations}
            fromCode={fromCode}
            toCode={toCode}
            journeyDate={journeyDate}
            timeWindow={timeWindow}
            onChangeFrom={setFromCode}
            onChangeTo={setToCode}
            onChangeDate={setJourneyDate}
            onChangeTimeWindow={setTimeWindow}
            onSwap={() => {
              setFromCode(toCode);
              setToCode(fromCode);
            }}
            onSearch={handleSearchTrains}
            isLoading={isSearching}
            errorMsg={searchError}
            language={language}
            onLanguageChange={setLanguage}
            t={t}
          />
        )}

        {activeScreen === 'results' && (
          <TrainResultsScreen
            trains={searchResults}
            fromCode={fromCode}
            toCode={toCode}
            journeyDate={journeyDate}
            onBackToSearch={() => setActiveScreen('search')}
            onSelectTrainForMap={handleOpenTrainMap}
            language={language}
            t={t}
          />
        )}

        {activeScreen === 'train-map' && selectedTrain && selectedCoach && (
          <TrainMap2D
            train={selectedTrain}
            selectedCoach={selectedCoach}
            seats={coachSeats}
            selectedSeatNumbers={selectedSeatNumbers}
            sessionId={sessionId}
            holdDurationMinutes={appConfig.holdDurationMinutes}
            isLoadingSeats={isLoadingSeats}
            isHolding={isHolding}
            errorMsg={mapError}
            onBackToResults={() => setActiveScreen('results')}
            onSelectCoach={(coach) => loadSeatsForCoach(selectedTrain, coach)}
            onToggleSeat={handleToggleSeat}
            onClearSelection={() => setSelectedSeatNumbers([])}
            onHoldAndProceed={handleHoldAndProceed}
            language={language}
            t={t}
          />
        )}

        {activeScreen === 'booking-flow' &&
          selectedTrain &&
          selectedCoach &&
          holdExpiresAt && (
            <BookingFlowScreen
              train={selectedTrain}
              coach={selectedCoach}
              selectedSeats={selectedSeatObjects}
              holdExpiresAt={holdExpiresAt}
              holdDurationMinutes={appConfig.holdDurationMinutes}
              pricingRules={pricingRules}
              user={user}
              savedPassengers={savedPassengers}
              integrations={integrations}
              onQuickLoginPassword={handleLoginPassword}
              onQuickRequestOtp={handleRequestOtp}
              onQuickVerifyOtp={handleVerifyOtp}
              onCancelHold={handleReleaseHoldAndBack}
              onHoldExpired={() => {
                setHoldExpiresAt(null);
                setSelectedSeatNumbers([]);
                if (selectedTrain && selectedCoach) {
                  loadSeatsForCoach(selectedTrain, selectedCoach);
                }
                setActiveScreen('train-map');
              }}
              onCompletePayment={handleCompletePayment}
              onRazorpayCheckout={handleRazorpayCheckout}
              language={language}
              t={t}
            />
          )}

        {activeScreen === 'confirmation' && confirmedBooking && (
          <ConfirmationScreen
            booking={confirmedBooking}
            appName={appConfig.appName}
            onGoToBookings={() => {
              refreshBookingsAndNotifications();
              setActiveScreen('my-bookings');
            }}
            onBookAnother={() => setActiveScreen('search')}
            language={language}
            t={t}
          />
        )}

        {activeScreen === 'my-bookings' && (
          <MyBookingsScreen
            bookings={bookings}
            appName={appConfig.appName}
            onCancelBooking={handleCancelBooking}
            onAdvanceRefund={handleAdvanceRefund}
            onGoSearch={() => setActiveScreen('search')}
            language={language}
            t={t}
          />
        )}

        {activeScreen === 'notifications' && (
          <NotificationsScreen
            notifications={notifications}
            onMarkAllRead={async () => {
              await railwayAdapter.markNotificationsRead(sessionId, authToken);
              await refreshBookingsAndNotifications();
            }}
            language={language}
            t={t}
          />
        )}

        {activeScreen === 'profile' && (
          <ProfileScreen
            user={user}
            authToken={authToken}
            savedPassengers={savedPassengers}
            onRefreshSavedPassengers={refreshSavedPassengers}
            onRegister={handleRegister}
            onLoginPassword={handleLoginPassword}
            onRequestOtp={handleRequestOtp}
            onVerifyOtp={handleVerifyOtp}
            onUpdateProfile={async (updates) => {
              const res = await railwayAdapter.updateProfile(updates, authToken);
              setUser(res.user);
            }}
            onRefreshUser={async () => {
              const res = await railwayAdapter.getCurrentUser(authToken);
              if (res.user) setUser(res.user);
            }}
            onLogout={async () => {
              await railwayAdapter.logout(authToken);
              setAuthToken(null);
              setUser(null);
              setSavedPassengers([]);
            }}
            onAccountDeleted={() => {
              setAuthToken(null);
              setUser(null);
              setSavedPassengers([]);
              setActiveScreen('home');
            }}
            onOpenAdmin={() => setActiveScreen('admin')}
            t={t}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            language={language}
            onLanguageChange={setLanguage}
            appConfig={appConfig}
            user={user}
            integrations={integrations}
            pricingRules={pricingRules}
            onUpdateAppName={async (name) => {
              const updated = await railwayAdapter.updateAppConfig({ appName: name }, authToken);
              setAppConfig(updated);
            }}
            onUpdatePricingRule={async (coachType, updates) => {
              const updated = await railwayAdapter.updatePricingRule(
                coachType,
                updates,
                authToken
              );
              setPricingRules(updated);
            }}
            onOpenAdmin={() => setActiveScreen('admin')}
            t={t}
          />
        )}

        {activeScreen === 'admin' && (
          <AdminDashboardScreen
            user={user}
            authToken={authToken}
            pricingRules={pricingRules}
            onAuthSuccess={async (token, nextUser) => {
              setAuthToken(token);
              setUser(nextUser);
              await refreshBookingsAndNotifications();
            }}
            onPricingUpdated={setPricingRules}
            onConfigUpdated={setAppConfig}
            onBackHome={() => setActiveScreen('home')}
          />
        )}
      </div>
    </div>
  );
}
