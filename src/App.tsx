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
import { DEFAULT_APP_CONFIG } from './config/appConfig';
import { TRANSLATIONS } from './i18n/translations';
import { railwayAdapter } from './services/railwayAdapter';
import { DEFAULT_PRICING_RULES } from './utils/fareCalculator';
import type {
  AppScreen,
  BookingRecord,
  CoachSummary,
  CoachType,
  CustomerUser,
  Language,
  NotificationItem,
  PassengerInput,
  PaymentMethod,
  PricingRule,
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

export default function App() {
  const [sessionId] = useState<string>(() => getOrCreateVisitorSessionId());
  const [language, setLanguage] = useState<Language>('en');
  const [appName, setAppName] = useState<string>(DEFAULT_APP_CONFIG.appNamePlaceholder);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');

  const [stations, setStations] = useState<Station[]>([]);
  const [pricingRules, setPricingRules] = useState<Record<CoachType, PricingRule>>(
    DEFAULT_PRICING_RULES
  );

  // Auth state (Bearer held strictly in React memory + HttpOnly session cookie on server)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<CustomerUser | null>(null);

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
      // Keep current lists if offline/transient
    }
  }, [sessionId, authToken]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [stList, pricing, me] = await Promise.all([
          railwayAdapter.listStations(),
          railwayAdapter.getPricingRules(),
          railwayAdapter.getCurrentUser(null),
        ]);
        if (!mounted) return;
        setStations(stList);
        setPricingRules(pricing);
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
      if (prev.length >= DEFAULT_APP_CONFIG.maxSeatsPerBooking) {
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

  const handleRequestOtp = async (mobile: string): Promise<string> => {
    const res = await railwayAdapter.requestDemoOtp(mobile);
    return res.demoOtpHint;
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
        appName={appName}
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
              pricingRules={pricingRules}
              user={user}
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
              language={language}
              t={t}
            />
          )}

        {activeScreen === 'confirmation' && confirmedBooking && (
          <ConfirmationScreen
            booking={confirmedBooking}
            appName={appName}
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
            appName={appName}
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
            onRequestOtp={handleRequestOtp}
            onVerifyOtp={handleVerifyOtp}
            onUpdateProfile={async (updates) => {
              const res = await railwayAdapter.updateProfile(updates, authToken);
              setUser(res.user);
            }}
            onLogout={async () => {
              await railwayAdapter.logout(authToken);
              setAuthToken(null);
              setUser(null);
            }}
            t={t}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            language={language}
            onLanguageChange={setLanguage}
            appName={appName}
            onUpdateAppName={setAppName}
            pricingRules={pricingRules}
            onUpdatePricingRule={async (coachType, updates) => {
              const updated = await railwayAdapter.updatePricingRule(coachType, updates);
              setPricingRules(updated);
            }}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
