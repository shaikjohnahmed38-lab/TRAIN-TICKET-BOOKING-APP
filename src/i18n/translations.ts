import type { Language } from '../types/railway';

export interface TranslationDictionary {
  nav: {
    searchTrains: string;
    myBookings: string;
    notifications: string;
    settings: string;
    profile: string;
    login: string;
    admin: string;
  };
  common: {
    demoNotice: string;
    demoFareBadge: string;
    back: string;
    continue: string;
    cancel: string;
    retry: string;
    loading: string;
    english: string;
    telugu: string;
    seats: string;
    seat: string;
    passengers: string;
    passenger: string;
    coach: string;
    pnr: string;
    status: string;
    close: string;
  };
  search: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    fromLabel: string;
    fromPlaceholder: string;
    toLabel: string;
    toPlaceholder: string;
    dateLabel: string;
    timeFilterLabel: string;
    allDepartures: string;
    morning: string;
    afternoon: string;
    evening: string;
    night: string;
    searchButton: string;
    swapStations: string;
    popularCorridors: string;
    recentTrainsTitle: string;
  };
  results: {
    title: string;
    foundTrains: string;
    noTrainsTitle: string;
    noTrainsDesc: string;
    modifySearch: string;
    viewSeatMapCta: string;
    available: string;
    waitingList: string;
    demoPriceFrom: string;
    duration: string;
    runsDaily: string;
  };
  trainMap: {
    title: string;
    consistHeading: string;
    engineLabel: string;
    selectCoachPrompt: string;
    coachInteriorHeading: string;
    entranceExit: string;
    windowSide: string;
    legendAvailable: string;
    legendBooked: string;
    legendWaitlist: string;
    legendSelected: string;
    legendHeld: string;
    selectedSeatsLabel: string;
    noSeatsSelected: string;
    holdAndProceed: string;
    pricePerPassenger: string;
    totalDemoFare: string;
    clearSelection: string;
    waitlistNotice: string;
    maxSeatsNotice: string;
  };
  booking: {
    holdBannerTitle: string;
    holdExpiredTitle: string;
    holdExpiredDesc: string;
    stepPassengers: string;
    stepFareSummary: string;
    stepPayment: string;
    loginRequiredTitle: string;
    loginRequiredDesc: string;
    fullName: string;
    age: string;
    gender: string;
    male: string;
    female: string;
    other: string;
    validationError: string;
    proceedToPayment: string;
    releaseHoldCancel: string;
    fareSummaryTitle: string;
    baseFare: string;
    reservationCharge: string;
    gstDemo: string;
    paymentTitle: string;
    paymentSubtitle: string;
    simulateOutcomeTitle: string;
    paySuccessBtn: string;
    payPendingBtn: string;
    payFailBtn: string;
    paymentFailedTitle: string;
    paymentFailedDesc: string;
    paymentPendingTitle: string;
    paymentPendingDesc: string;
  };
  confirmation: {
    confirmedTitle: string;
    wlTitle: string;
    pendingTitle: string;
    downloadPdfBtn: string;
    viewMyBookingsBtn: string;
    bookAnotherBtn: string;
    notValidTravel: string;
  };
  myBookings: {
    title: string;
    subtitle: string;
    tabUpcoming: string;
    tabCompleted: string;
    tabCancelled: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDesc: string;
    downloadTicket: string;
    cancelBooking: string;
    cancelConfirmTitle: string;
    cancelConfirmDesc: string;
    confirmCancelBtn: string;
    refundTracker: string;
    refundAmountLabel: string;
  };
  notifications: {
    title: string;
    subtitle: string;
    simulatedBadge: string;
    markAllRead: string;
    empty: string;
  };
  profile: {
    title: string;
    loginTitle: string;
    loginSubtitle: string;
    mobileLabel: string;
    mobilePlaceholder: string;
    sendOtpBtn: string;
    otpLabel: string;
    otpHintLabel: string;
    verifyLoginBtn: string;
    nameLabel: string;
    emailLabel: string;
    saveProfileBtn: string;
    logoutBtn: string;
    demoAuthDisclaimer: string;
  };
  settings: {
    title: string;
    subtitle: string;
    languageSection: string;
    appNameSection: string;
    pricingSection: string;
    futureArchitectureSection: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    nav: {
      searchTrains: 'Search Trains',
      myBookings: 'My Bookings',
      notifications: 'Notifications',
      settings: 'Settings',
      profile: 'Profile',
      login: 'Sign In',
      admin: 'Admin',
    },
    common: {
      demoNotice:
        'TRAINSYNK · Persistent SQLite reservations & live WebSocket seat map · External rail/payment gateways reflect configured status',
      demoFareBadge: 'Standard Tariff',
      back: 'Back',
      continue: 'Continue',
      cancel: 'Cancel',
      retry: 'Retry Payment',
      loading: 'Loading...',
      english: 'English',
      telugu: 'తెలుగు',
      seats: 'Seats',
      seat: 'Seat',
      passengers: 'Passengers',
      passenger: 'Passenger',
      coach: 'Coach',
      pnr: 'PNR',
      status: 'Status',
      close: 'Close',
    },
    search: {
      eyebrow: 'Andhra Pradesh & Telangana Express Network',
      headline: 'Inspect every coach and berth before you book',
      subheadline:
        'Search regional trains across AP & Telangana, explore the live interactive 2D train and coach interior schematic, and complete your reservation.',
      fromLabel: 'From Station',
      fromPlaceholder: 'Search city or station code (e.g. Secunderabad)',
      toLabel: 'To Station',
      toPlaceholder: 'Search destination (e.g. Visakhapatnam)',
      dateLabel: 'Journey Date',
      timeFilterLabel: 'Departure Window',
      allDepartures: 'All Times',
      morning: 'Morning (04:00–11:59)',
      afternoon: 'Afternoon (12:00–16:59)',
      evening: 'Evening (17:00–20:59)',
      night: 'Night (21:00–03:59)',
      searchButton: 'Search Trains',
      swapStations: 'Swap From and To stations',
      popularCorridors: 'Popular AP & Telangana Routes',
      recentTrainsTitle: 'Quick Departure Preview',
    },
    results: {
      title: 'Available Trains',
      foundTrains: 'trains found for your route',
      noTrainsTitle: 'No direct trains on this pair',
      noTrainsDesc:
        'Try Secunderabad (SC) to Visakhapatnam (VSKP), Tirupati (TPTY), Vijayawada (BZA), or Warangal (WL).',
      modifySearch: 'Modify Search',
      viewSeatMapCta: 'VIEW SEAT AVAILABILITY IN TRAIN',
      available: 'Available',
      waitingList: 'WL',
      demoPriceFrom: 'Fares from',
      duration: 'Duration',
      runsDaily: 'Daily Express Service',
    },
    trainMap: {
      title: 'Interactive 2D Train & Coach Layout',
      consistHeading: 'Complete Train Formation (Click any coach to inspect interior)',
      engineLabel: 'LOCO ENGINE',
      selectCoachPrompt: 'Selected Coach Interior',
      coachInteriorHeading: '2D Coach Blueprint',
      entranceExit: 'ENTRY / EXIT',
      windowSide: 'WINDOW',
      legendAvailable: 'Available (White)',
      legendBooked: 'Booked / Confirmed (Green)',
      legendWaitlist: 'Waiting List (Yellow)',
      legendSelected: 'Currently Selected (Blue)',
      legendHeld: 'Temporarily Held',
      selectedSeatsLabel: 'Selected Seats',
      noSeatsSelected: 'Tap any white (Available) or yellow (WL) berth on the 2D layout to select.',
      holdAndProceed: 'Hold Seats & Proceed',
      pricePerPassenger: 'Fare / Passenger',
      totalDemoFare: 'Total Fare',
      clearSelection: 'Clear Selection',
      waitlistNotice: 'Includes Waiting List (WL) berth selection — booking will issue WL status.',
      maxSeatsNotice: 'Maximum allowed seats reached for a single booking.',
    },
    booking: {
      holdBannerTitle: 'Seats Temporarily Reserved for',
      holdExpiredTitle: 'Seat Hold Expired',
      holdExpiredDesc:
        'Your temporary seat reservation timed out and the seats have been released back to inventory.',
      stepPassengers: '1. Passenger Details',
      stepFareSummary: '2. Fare Summary',
      stepPayment: '2. Payment',
      loginRequiredTitle: 'Link Booking to Your Account',
      loginRequiredDesc: 'Sign in with password or mobile OTP to link tickets, saved co-travellers, and alerts.',
      fullName: 'Full Name',
      age: 'Age',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      validationError: 'Please enter a valid full name, age (1–115), and gender for every passenger.',
      proceedToPayment: 'Continue to Payment',
      releaseHoldCancel: 'Cancel & Release Seats',
      fareSummaryTitle: 'Fare Breakdown',
      baseFare: 'Base Ticket Fare',
      reservationCharge: 'Reservation Charge',
      gstDemo: 'GST (5%)',
      paymentTitle: 'Payment Checkout',
      paymentSubtitle: 'Complete payment using your configured gateway or sandbox checkout.',
      simulateOutcomeTitle: 'Sandbox Gateway Checkout (Razorpay keys not configured)',
      paySuccessBtn: 'Complete Payment',
      payPendingBtn: 'Mark Payment Pending',
      payFailBtn: 'Simulate Payment Failure',
      paymentFailedTitle: 'Payment Failed',
      paymentFailedDesc:
        'Your seats remain temporarily held until the hold timer expires. You can retry immediately.',
      paymentPendingTitle: 'Payment Pending',
      paymentPendingDesc:
        'This booking has been recorded as Payment Pending while seats stay on temporary hold.',
    },
    confirmation: {
      confirmedTitle: 'Booking Confirmed',
      wlTitle: 'Ticket Issued (Waiting List)',
      pendingTitle: 'Booking Saved as Payment Pending',
      downloadPdfBtn: 'Download E-Ticket PDF',
      viewMyBookingsBtn: 'Go to My Bookings',
      bookAnotherBtn: 'Search Another Train',
      notValidTravel: 'TRAINSYNK LOCAL RESERVATION RECORD',
    },
    myBookings: {
      title: 'My Bookings',
      subtitle: 'Persistent reservation records, PDF e-tickets, cancellations, and refund tracking.',
      tabUpcoming: 'Upcoming',
      tabCompleted: 'Completed',
      tabCancelled: 'Cancelled',
      searchPlaceholder: 'Search by PNR, train number, or station...',
      emptyTitle: 'No bookings in this view',
      emptyDesc: 'Book a seat from the Search Trains flow or switch tabs to view other journeys.',
      downloadTicket: 'Download PDF',
      cancelBooking: 'Cancel Ticket',
      cancelConfirmTitle: 'Cancel Reservation?',
      cancelConfirmDesc:
        'Booked seats will be immediately released back to Available in the 2D train map and a refund record will start.',
      confirmCancelBtn: 'Confirm Cancellation',
      refundTracker: 'Refund Status',
      refundAmountLabel: 'Estimated Refund',
    },
    notifications: {
      title: 'Notifications',
      subtitle: 'Live alerts for bookings, payments, refunds, and operator schedule broadcasts.',
      simulatedBadge: 'ALERT',
      markAllRead: 'Mark all as read',
      empty: 'No notifications yet.',
    },
    profile: {
      title: 'Customer Account',
      loginTitle: 'Account Sign In & Registration',
      loginSubtitle: 'Sign in with email/mobile & password, create a new account, or use mobile OTP.',
      mobileLabel: '10-Digit Mobile Number',
      mobilePlaceholder: 'e.g. 9876543210',
      sendOtpBtn: 'Send OTP',
      otpLabel: 'Enter 6-Digit OTP',
      otpHintLabel: 'Sandbox OTP Preview (Twilio not configured)',
      verifyLoginBtn: 'Verify & Sign In',
      nameLabel: 'Full Name',
      emailLabel: 'Email Address',
      saveProfileBtn: 'Save Profile',
      logoutBtn: 'Sign Out',
      demoAuthDisclaimer:
        'Real SMS delivery activates automatically when TWILIO_* env vars are configured.',
    },
    settings: {
      title: 'Settings & System Readiness',
      subtitle: 'Language preferences, integration status, tariffs, and Admin Portal access.',
      languageSection: 'Language / భాష',
      appNameSection: 'Application Identity & Configuration',
      pricingSection: 'Coach Class Pricing Tariffs',
      futureArchitectureSection: 'Integration & Gateway Status',
    },
  },
  te: {
    nav: {
      searchTrains: 'రైళ్లు వెతకండి',
      myBookings: 'నా బుకింగ్స్',
      notifications: 'నోటిఫికేషన్లు',
      settings: 'సెట్టింగ్స్',
      profile: 'ప్రొఫైల్',
      login: 'సైన్ ఇన్',
      admin: 'అడ్మిన్',
    },
    common: {
      demoNotice:
        'TRAINSYNK · SQLite డేటాబేస్ & లైవ్ WebSocket సీట్ల మ్యాప్ · బాహ్య గేట్‌వేలు కాన్ఫిగరేషన్ ప్రకారం పనిచేస్తాయి',
      demoFareBadge: 'ప్రామాణిక ధర',
      back: 'వెనుకకు',
      continue: 'కొనసాగించండి',
      cancel: 'రద్దు చేయండి',
      retry: 'మళ్ళీ ప్రయత్నించండి',
      loading: 'లోడ్ అవుతోంది...',
      english: 'English',
      telugu: 'తెలుగు',
      seats: 'సీట్లు',
      seat: 'సీటు',
      passengers: 'ప్రయాణికులు',
      passenger: 'ప్రయాణికుడు',
      coach: 'కోచ్',
      pnr: 'PNR',
      status: 'స్థితి',
      close: 'మూసివేయండి',
    },
    search: {
      eyebrow: 'ఆంధ్రప్రదేశ్ & తెలంగాణ ఎక్స్‌ప్రెస్ నెట్‌వర్క్',
      headline: 'బుకింగ్ ముందు ప్రతి కోచ్ మరియు బెర్త్‌ను 2D లో చూడండి',
      subheadline:
        'AP మరియు తెలంగాణ స్టేషన్ల మధ్య రైళ్లను వెతకండి, లైవ్ 2D కోచ్ లోపలి మ్యాప్‌లో సీట్లు ఎంచుకోండి మరియు బుకింగ్ పూర్తి చేయండి.',
      fromLabel: 'బయలుదేరే స్టేషన్',
      fromPlaceholder: 'నగరం లేదా స్టేషన్ కోడ్ (ఉదా. సికింద్రాబాద్)',
      toLabel: 'చేరుకునే స్టేషన్',
      toPlaceholder: 'గమ్యస్థానం (ఉదా. విశాఖపట్నం)',
      dateLabel: 'ప్రయాణ తేదీ',
      timeFilterLabel: 'బయలుదేరే సమయం',
      allDepartures: 'అన్ని సమయాలు',
      morning: 'ఉదయం (04:00–11:59)',
      afternoon: 'మధ్యాహ్నం (12:00–16:59)',
      evening: 'సాయంత్రం (17:00–20:59)',
      night: 'రాత్రి (21:00–03:59)',
      searchButton: 'రైళ్లు వెతకండి',
      swapStations: 'స్టేషన్లను మార్చండి',
      popularCorridors: 'ప్రముఖ AP & తెలంగాణ మార్గాలు',
      recentTrainsTitle: 'బయలుదేరే సమయాల ప్రివ్యూ',
    },
    results: {
      title: 'అందుబాటులో ఉన్న రైళ్లు',
      foundTrains: 'రైళ్లు లభించాయి',
      noTrainsTitle: 'ఈ మార్గంలో ప్రత్యక్ష రైళ్లు లేవు',
      noTrainsDesc:
        'సికింద్రాబాద్ (SC) నుండి విశాఖపట్నం (VSKP), తిరుపతి (TPTY), లేదా విజయవాడ (BZA) ప్రయత్నించండి.',
      modifySearch: 'శోధన మార్చండి',
      viewSeatMapCta: 'రైలులో సీట్ల లభ్యత చూడండి',
      available: 'ఖాళీగా ఉన్నాయి',
      waitingList: 'వెయిటింగ్ లిస్ట్',
      demoPriceFrom: 'ధర ప్రారంభం',
      duration: 'సమయం',
      runsDaily: 'ప్రతిరోజూ సర్వీస్',
    },
    trainMap: {
      title: 'ఇంటరాక్టివ్ 2D రైలు & కోచ్ మ్యాప్',
      consistHeading: 'పూర్తి రైలు నిర్మాణం (లోపలి భాగం చూడటానికి కోచ్‌పై క్లిక్ చేయండి)',
      engineLabel: 'ఇంజిన్',
      selectCoachPrompt: 'ఎంచుకున్న కోచ్ లోపలి భాగం',
      coachInteriorHeading: '2D కోచ్ బ్లూప్రింట్',
      entranceExit: 'ప్రవేశ / నిష్క్రమణ ద్వారం',
      windowSide: 'కిటికీ',
      legendAvailable: 'ఖాళీ (తెలుపు)',
      legendBooked: 'బుక్ చేయబడింది (ఆకుపచ్చ)',
      legendWaitlist: 'వెయిటింగ్ లిస్ట్ (పసుపు)',
      legendSelected: 'ఎంచుకున్నవి (నీలం)',
      legendHeld: 'తాత్కాలికంగా హోల్డ్‌లో ఉంది',
      selectedSeatsLabel: 'ఎంచుకున్న సీట్లు',
      noSeatsSelected: 'ఎంచుకోవడానికి తెలుపు (ఖాళీ) లేదా పసుపు (WL) సీటుపై నొక్కండి.',
      holdAndProceed: 'సీట్లు హోల్డ్ చేసి కొనసాగండి',
      pricePerPassenger: 'ఒక్కో ప్రయాణికునికి ధర',
      totalDemoFare: 'మొత్తం ఛార్జీ',
      clearSelection: 'ఎంపిక క్లియర్ చేయండి',
      waitlistNotice: 'వెయిటింగ్ లిస్ట్ (WL) సీటు ఎంచుకున్నారు — WL టికెట్ జారీ అవుతుంది.',
      maxSeatsNotice: 'ఒక బుకింగ్‌లో అనుమతించిన గరిష్ట సీట్లు పూర్తయ్యాయి.',
    },
    booking: {
      holdBannerTitle: 'సీట్లు తాత్కాలికంగా రిజర్వ్ చేయబడ్డాయి',
      holdExpiredTitle: 'సీట్ల హోల్డ్ సమయం ముగిసింది',
      holdExpiredDesc: 'మీ తాత్కాలిక సీట్ల రిజర్వేషన్ గడువు ముగిసింది మరియు సీట్లు విడుదల చేయబడ్డాయి.',
      stepPassengers: '1. ప్రయాణికుల వివరాలు',
      stepFareSummary: '2. ఛార్జీల వివరం',
      stepPayment: '2. చెల్లింపు',
      loginRequiredTitle: 'ఖాతాకు బుకింగ్ లింక్ చేయండి',
      loginRequiredDesc: 'మీ టికెట్లు మరియు సహ-ప్రయాణికులను సేవ్ చేయడానికి పాస్‌వర్డ్ లేదా OTP తో లాగిన్ అవ్వండి.',
      fullName: 'పూర్తి పేరు',
      age: 'వయసు',
      gender: 'లింగం',
      male: 'పురుషుడు',
      female: 'స్త్రీ',
      other: 'ఇతరులు',
      validationError: 'దయచేసి ప్రతి ప్రయాణికునికి సరైన పేరు, వయసు మరియు లింగం నమోదు చేయండి.',
      proceedToPayment: 'చెల్లింపుకు వెళ్లండి',
      releaseHoldCancel: 'రద్దు చేసి సీట్లు విడుదల చేయండి',
      fareSummaryTitle: 'ఛార్జీల వివరాలు',
      baseFare: 'మూల టికెట్ ఛార్జీ',
      reservationCharge: 'రిజర్వేషన్ రుసుము',
      gstDemo: 'GST (5%)',
      paymentTitle: 'చెల్లింపు గేట్‌వే',
      paymentSubtitle: 'కాన్ఫిగర్ చేసిన గేట్‌వే లేదా శాండ్‌బాక్స్ ద్వారా చెల్లింపు పూర్తి చేయండి.',
      simulateOutcomeTitle: 'శాండ్‌బాక్స్ చెల్లింపు పరీక్ష (Razorpay కీలు లేవు)',
      paySuccessBtn: 'చెల్లింపు పూర్తి చేయండి',
      payPendingBtn: 'పెండింగ్‌గా సేవ్ చేయండి',
      payFailBtn: 'చెల్లింపు విఫలం (టెస్ట్)',
      paymentFailedTitle: 'చెల్లింపు విఫలమైంది',
      paymentFailedDesc: 'హోల్డ్ టైమర్ ముగిసే వరకు మీ సీట్లు హోల్డ్‌లో ఉంటాయి. మళ్ళీ ప్రయత్నించవచ్చు.',
      paymentPendingTitle: 'చెల్లింపు పెండింగ్‌లో ఉంది',
      paymentPendingDesc: 'సీట్లు తాత్కాలిక హోల్డ్‌లో ఉండగా ఈ బుకింగ్ Payment Pending గా సేవ్ చేయబడింది.',
    },
    confirmation: {
      confirmedTitle: 'బుకింగ్ నిర్ధారించబడింది',
      wlTitle: 'టికెట్ జారీ చేయబడింది (WL)',
      pendingTitle: 'బుకింగ్ పెండింగ్‌లో సేవ్ చేయబడింది',
      downloadPdfBtn: 'ఈ-టికెట్ PDF డౌన్‌లోడ్ చేయండి',
      viewMyBookingsBtn: 'నా బుకింగ్స్‌కు వెళ్లండి',
      bookAnotherBtn: 'మరో రైలు వెతకండి',
      notValidTravel: 'TRAINSYNK లోకల్ రిజర్వేషన్ రికార్డు',
    },
    myBookings: {
      title: 'నా బుకింగ్స్',
      subtitle: 'బుకింగ్ వివరాలు, PDF టికెట్లు, రద్దు మరియు రీఫండ్ స్థితి ట్రాకింగ్.',
      tabUpcoming: 'రాబోయేవి',
      tabCompleted: 'పూర్తయినవి',
      tabCancelled: 'రద్దయినవి',
      searchPlaceholder: 'PNR, రైలు నంబర్ లేదా స్టేషన్ వెతకండి...',
      emptyTitle: 'ఈ విభాగంలో బుకింగ్స్ లేవు',
      emptyDesc: 'కొత్త సీటు బుక్ చేయండి లేదా ఇతర ట్యాబ్‌లను చూడండి.',
      downloadTicket: 'PDF డౌన్‌లోడ్',
      cancelBooking: 'టికెట్ రద్దు చేయండి',
      cancelConfirmTitle: 'రిజర్వేషన్ రద్దు చేయాలా?',
      cancelConfirmDesc: 'బుక్ చేసిన సీట్లు వెంటనే 2D మ్యాప్‌లో ఖాళీ అవుతాయి మరియు రీఫండ్ ప్రారంభమవుతుంది.',
      confirmCancelBtn: 'రద్దును నిర్ధారించండి',
      refundTracker: 'రీఫండ్ స్థితి',
      refundAmountLabel: 'అంచనా రీఫండ్',
    },
    notifications: {
      title: 'నోటిఫికేషన్లు',
      subtitle: 'బుకింగ్స్, చెల్లింపులు, రీఫండ్‌లు మరియు రైలు సమయాల లైవ్ హెచ్చరికలు.',
      simulatedBadge: 'హెచ్చరిక',
      markAllRead: 'అన్నీ చదివినట్లు గుర్తించు',
      empty: 'నోటిఫికేషన్లు లేవు.',
    },
    profile: {
      title: 'కస్టమర్ ఖాతా',
      loginTitle: 'ఖాతా సైన్ ఇన్ & రిజిస్ట్రేషన్',
      loginSubtitle: 'ఈమెయిల్/మొబైల్ & పాస్‌వర్డ్ లేదా OTP తో లాగిన్ అవ్వండి.',
      mobileLabel: '10-అంకెల మొబైల్ నంబర్',
      mobilePlaceholder: 'ఉదా. 9876543210',
      sendOtpBtn: 'OTP పొందండి',
      otpLabel: '6-అంకెల OTP నమోదు చేయండి',
      otpHintLabel: 'శాండ్‌బాక్స్ OTP ప్రివ్యూ (Twilio లేదు)',
      verifyLoginBtn: 'ధృవీకరించి లాగిన్ అవ్వండి',
      nameLabel: 'పూర్తి పేరు',
      emailLabel: 'ఈమెయిల్',
      saveProfileBtn: 'ప్రొఫైల్ సేవ్ చేయండి',
      logoutBtn: 'లాగ్ అవుట్',
      demoAuthDisclaimer: 'TWILIO_* కీలు జోడించినప్పుడు నిజమైన SMS పంపబడుతుంది.',
    },
    settings: {
      title: 'సెట్టింగ్స్ & సిస్టమ్ స్థితి',
      subtitle: 'భాష, ఇంటిగ్రేషన్ స్థితి, ఛార్జీలు మరియు అడ్మిన్ పోర్టల్.',
      languageSection: 'భాష / Language',
      appNameSection: 'యాప్ కాన్ఫిగరేషన్',
      pricingSection: 'కోచ్ ధర నియమాలు',
      futureArchitectureSection: 'ఇంటిగ్రేషన్ & గేట్‌వే స్థితి',
    },
  },
};
