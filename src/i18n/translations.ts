import type { Language } from '../types/railway';

export interface TranslationDictionary {
  nav: {
    searchTrains: string;
    myBookings: string;
    notifications: string;
    settings: string;
    profile: string;
    login: string;
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
      login: 'Customer Login',
    },
    common: {
      demoNotice: 'Demo MVP · Simulated railway data & payments · Not valid for travel',
      demoFareBadge: 'Demo Fare',
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
      pnr: 'Demo PNR',
      status: 'Status',
      close: 'Close',
    },
    search: {
      eyebrow: 'Andhra Pradesh & Telangana Demo Corridor',
      headline: 'Inspect every coach and berth before you book',
      subheadline:
        'Search regional trains across AP & Telangana, explore the interactive 2D train and coach interior schematic, and test the complete reservation workflow.',
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
      recentTrainsTitle: 'Quick Demo Departure Preview',
    },
    results: {
      title: 'Available Demo Trains',
      foundTrains: 'trains found for your route',
      noTrainsTitle: 'No direct demo trains on this pair',
      noTrainsDesc:
        'Try Secunderabad (SC) to Visakhapatnam (VSKP), Tirupati (TPTY), Vijayawada (BZA), or Warangal (WL).',
      modifySearch: 'Modify Search',
      viewSeatMapCta: 'VIEW SEAT AVAILABILITY IN TRAIN',
      available: 'Available',
      waitingList: 'WL',
      demoPriceFrom: 'Demo fares from',
      duration: 'Duration',
      runsDaily: 'Daily Demo Service',
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
      holdAndProceed: 'Hold Seats (15 Min) & Proceed',
      pricePerPassenger: 'Demo Fare / Passenger',
      totalDemoFare: 'Total Demo Fare',
      clearSelection: 'Clear Selection',
      waitlistNotice: 'Includes Waiting List (WL) berth selection — booking will issue WL status.',
      maxSeatsNotice: 'Maximum 6 seats allowed per demo booking.',
    },
    booking: {
      holdBannerTitle: 'Seats Temporarily Reserved for',
      holdExpiredTitle: '15-Minute Seat Hold Expired',
      holdExpiredDesc:
        'Your temporary seat reservation timed out and the seats have been released back to inventory.',
      stepPassengers: '1. Passenger Details',
      stepFareSummary: '2. Fare Summary',
      stepPayment: '3. Demo Payment',
      loginRequiredTitle: 'Demo Mobile Verification',
      loginRequiredDesc: 'Sign in with a mobile number and simulated OTP to link this demo ticket to your profile.',
      fullName: 'Full Name',
      age: 'Age',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      validationError: 'Please enter a valid full name, age (1–115), and gender for every passenger.',
      proceedToPayment: 'Continue to Demo Payment',
      releaseHoldCancel: 'Cancel & Release Seats',
      fareSummaryTitle: 'Demo Fare Breakdown',
      baseFare: 'Base Demo Ticket Fare',
      reservationCharge: 'Demo Reservation Charge',
      gstDemo: 'Simulated GST',
      paymentTitle: 'Simulated Demo Payment Gateway',
      paymentSubtitle: 'No real money or real banking credentials are collected.',
      simulateOutcomeTitle: 'Select Simulated Payment Outcome to Test',
      paySuccessBtn: 'Simulate Payment Success',
      payPendingBtn: 'Simulate Payment Pending',
      payFailBtn: 'Simulate Payment Failure',
      paymentFailedTitle: 'Demo Payment Failed',
      paymentFailedDesc:
        'Your seats remain temporarily held until the 15-minute timer expires. You can retry immediately.',
      paymentPendingTitle: 'Demo Payment Pending',
      paymentPendingDesc:
        'This booking has been recorded as Payment Pending while seats stay on temporary hold.',
    },
    confirmation: {
      confirmedTitle: 'Demo Booking Confirmed',
      wlTitle: 'Demo Ticket Issued (Waiting List)',
      pendingTitle: 'Booking Saved as Payment Pending',
      downloadPdfBtn: 'Download E-Ticket PDF',
      viewMyBookingsBtn: 'Go to My Bookings',
      bookAnotherBtn: 'Search Another Train',
      notValidTravel: 'DEMO – NOT VALID FOR TRAVEL',
    },
    myBookings: {
      title: 'My Demo Bookings',
      subtitle: 'Persistent booking records, PDF tickets, cancellations, and simulated refund tracking.',
      tabUpcoming: 'Upcoming',
      tabCompleted: 'Completed',
      tabCancelled: 'Cancelled',
      searchPlaceholder: 'Search by Demo PNR, train number, or station...',
      emptyTitle: 'No bookings in this view',
      emptyDesc: 'Book a seat from the Search Trains flow or switch tabs to view other journeys.',
      downloadTicket: 'Download PDF',
      cancelBooking: 'Cancel Ticket',
      cancelConfirmTitle: 'Cancel Demo Ticket?',
      cancelConfirmDesc:
        'Booked seats will be immediately released back to Available in the 2D train map and a simulated refund will start.',
      confirmCancelBtn: 'Confirm Cancellation',
      refundTracker: 'Simulated Refund Status',
      refundAmountLabel: 'Estimated Demo Refund',
    },
    notifications: {
      title: 'In-App Notifications',
      subtitle: 'Clearly marked simulated alerts for bookings, payments, refunds, and schedule updates.',
      simulatedBadge: 'SIMULATED ALERT',
      markAllRead: 'Mark all as read',
      empty: 'No notifications yet.',
    },
    profile: {
      title: 'Customer Account',
      loginTitle: 'Mobile Number Login (Demo OTP)',
      loginSubtitle: 'Uses a simulated OTP code for testing. No real SMS messages are sent.',
      mobileLabel: '10-Digit Mobile Number',
      mobilePlaceholder: 'e.g. 9876543210',
      sendOtpBtn: 'Generate Demo OTP',
      otpLabel: 'Enter 6-Digit Demo OTP',
      otpHintLabel: 'Simulated OTP (for MVP testing)',
      verifyLoginBtn: 'Verify & Sign In',
      nameLabel: 'Full Name',
      emailLabel: 'Email Address (Optional)',
      saveProfileBtn: 'Save Profile',
      logoutBtn: 'Sign Out',
      demoAuthDisclaimer:
        'Demo authentication only. No real telecom SMS verification is active.',
    },
    settings: {
      title: 'Settings & Architecture',
      subtitle: 'Language preferences, configurable placeholder branding, demo pricing, and integration readiness.',
      languageSection: 'Language / భాష',
      appNameSection: 'Configurable App Name Placeholder',
      pricingSection: 'Configurable Demo Pricing Rules',
      futureArchitectureSection: 'Future Admin, Owner & Official Railway API Readiness',
    },
  },
  te: {
    nav: {
      searchTrains: 'రైళ్లు వెతకండి',
      myBookings: 'నా బుకింగ్స్',
      notifications: 'నోటిఫికేషన్లు',
      settings: 'సెట్టింగ్స్',
      profile: 'ప్రొఫైల్',
      login: 'లాగిన్',
    },
    common: {
      demoNotice: 'డెమో MVP · నమూనా రైల్వే డేటా & చెల్లింపులు · ప్రయాణానికి చెల్లదు',
      demoFareBadge: 'డెమో ఛార్జీ',
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
      pnr: 'డెమో PNR',
      status: 'స్థితి',
      close: 'మూసివేయండి',
    },
    search: {
      eyebrow: 'ఆంధ్రప్రదేశ్ & తెలంగాణ డెమో రైలు మార్గాలు',
      headline: 'బుకింగ్ ముందు ప్రతి కోచ్ మరియు బెర్త్‌ను 2D లో చూడండి',
      subheadline:
        'AP మరియు తెలంగాణ స్టేషన్ల మధ్య డెమో రైళ్లను వెతకండి, 2D కోచ్ లోపలి మ్యాప్‌లో సీట్లు ఎంచుకోండి మరియు పూర్తి బుకింగ్ విధానాన్ని పరీక్షించండి.',
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
      recentTrainsTitle: 'డెమో బయలుదేరే సమయాలు',
    },
    results: {
      title: 'అందుబాటులో ఉన్న డెమో రైళ్లు',
      foundTrains: 'రైళ్లు లభించాయి',
      noTrainsTitle: 'ఈ మార్గంలో ప్రత్యక్ష డెమో రైళ్లు లేవు',
      noTrainsDesc:
        'సికింద్రాబాద్ (SC) నుండి విశాఖపట్నం (VSKP), తిరుపతి (TPTY), లేదా విజయవాడ (BZA) ప్రయత్నించండి.',
      modifySearch: 'శోధన మార్చండి',
      viewSeatMapCta: 'రైలులో సీట్ల లభ్యత చూడండి',
      available: 'ఖాళీగా ఉన్నాయి',
      waitingList: 'వెయిటింగ్ లిస్ట్',
      demoPriceFrom: 'డెమో ధర ప్రారంభం',
      duration: 'సమయం',
      runsDaily: 'ప్రతిరోజూ డెమో సర్వీస్',
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
      holdAndProceed: 'సీట్లు హోల్డ్ చేసి కొనసాగండి (15 నిమిషాలు)',
      pricePerPassenger: 'ఒక్కో ప్రయాణికునికి డెమో ధర',
      totalDemoFare: 'మొత్తం డెమో ఛార్జీ',
      clearSelection: 'ఎంపిక క్లియర్ చేయండి',
      waitlistNotice: 'వెయిటింగ్ లిస్ట్ (WL) సీటు ఎంచుకున్నారు — WL టికెట్ జారీ అవుతుంది.',
      maxSeatsNotice: 'ఒక డెమో బుకింగ్‌లో గరిష్టంగా 6 సీట్లు మాత్రమే.',
    },
    booking: {
      holdBannerTitle: 'సీట్లు తాత్కాలికంగా రిజర్వ్ చేయబడ్డాయి',
      holdExpiredTitle: '15 నిమిషాల హోల్డ్ సమయం ముగిసింది',
      holdExpiredDesc: 'మీ తాత్కాలిక సీట్ల రిజర్వేషన్ గడువు ముగిసింది మరియు సీట్లు విడుదల చేయబడ్డాయి.',
      stepPassengers: '1. ప్రయాణికుల వివరాలు',
      stepFareSummary: '2. ఛార్జీల వివరం',
      stepPayment: '3. డెమో చెల్లింపు',
      loginRequiredTitle: 'డెమో మొబైల్ ధృవీకరణ',
      loginRequiredDesc: 'మీ బుకింగ్‌ను సేవ్ చేయడానికి మొబైల్ నంబర్ మరియు డెమో OTP తో లాగిన్ అవ్వండి.',
      fullName: 'పూర్తి పేరు',
      age: 'వయసు',
      gender: 'లింగం',
      male: 'పురుషుడు',
      female: 'స్త్రీ',
      other: 'ఇతరులు',
      validationError: 'దయచేసి ప్రతి ప్రయాణికునికి సరైన పేరు, వయసు మరియు లింగం నమోదు చేయండి.',
      proceedToPayment: 'డెమో చెల్లింపుకు వెళ్లండి',
      releaseHoldCancel: 'రద్దు చేసి సీట్లు విడుదల చేయండి',
      fareSummaryTitle: 'డెమో ఛార్జీల వివరాలు',
      baseFare: 'మూల డెమో టికెట్ ఛార్జీ',
      reservationCharge: 'డెమో రిజర్వేషన్ రుసుము',
      gstDemo: 'నమూనా GST',
      paymentTitle: 'నమూనా డెమో చెల్లింపు గేట్‌వే',
      paymentSubtitle: 'నిజమైన డబ్బు లేదా బ్యాంక్ వివరాలు తీసుకోబడవు.',
      simulateOutcomeTitle: 'పరీక్షించడానికి చెల్లింపు ఫలితాన్ని ఎంచుకోండి',
      paySuccessBtn: 'చెల్లింపు విజయం (Success)',
      payPendingBtn: 'చెల్లింపు పెండింగ్ (Pending)',
      payFailBtn: 'చెల్లింపు విఫలం (Failure)',
      paymentFailedTitle: 'డెమో చెల్లింపు విఫలమైంది',
      paymentFailedDesc: '15 నిమిషాల టైమర్ ముగిసే వరకు మీ సీట్లు హోల్డ్‌లో ఉంటాయి. మళ్ళీ ప్రయత్నించవచ్చు.',
      paymentPendingTitle: 'డెమో చెల్లింపు పెండింగ్‌లో ఉంది',
      paymentPendingDesc: 'సీట్లు తాత్కాలిక హోల్డ్‌లో ఉండగా ఈ బుకింగ్ Payment Pending గా సేవ్ చేయబడింది.',
    },
    confirmation: {
      confirmedTitle: 'డెమో బుకింగ్ నిర్ధారించబడింది',
      wlTitle: 'డెమో టికెట్ జారీ చేయబడింది (WL)',
      pendingTitle: 'బుకింగ్ పెండింగ్‌లో సేవ్ చేయబడింది',
      downloadPdfBtn: 'ఈ-టికెట్ PDF డౌన్‌లోడ్ చేయండి',
      viewMyBookingsBtn: 'నా బుకింగ్స్‌కు వెళ్లండి',
      bookAnotherBtn: 'మరో రైలు వెతకండి',
      notValidTravel: 'డెమో – ప్రయాణానికి చెల్లదు',
    },
    myBookings: {
      title: 'నా డెమో బుకింగ్స్',
      subtitle: 'బుకింగ్ వివరాలు, PDF టికెట్లు, రద్దు మరియు రీఫండ్ స్థితి ట్రాకింగ్.',
      tabUpcoming: 'రాబోయేవి',
      tabCompleted: 'పూర్తయినవి',
      tabCancelled: 'రద్దయినవి',
      searchPlaceholder: 'డెమో PNR, రైలు నంబర్ లేదా స్టేషన్ వెతకండి...',
      emptyTitle: 'ఈ విభాగంలో బుకింగ్స్ లేవు',
      emptyDesc: 'కొత్త సీటు బుక్ చేయండి లేదా ఇతర ట్యాబ్‌లను చూడండి.',
      downloadTicket: 'PDF డౌన్‌లోడ్',
      cancelBooking: 'టికెట్ రద్దు చేయండి',
      cancelConfirmTitle: 'డెమో టికెట్ రద్దు చేయాలా?',
      cancelConfirmDesc: 'బుక్ చేసిన సీట్లు వెంటనే 2D మ్యాప్‌లో ఖాళీ అవుతాయి మరియు డెమో రీఫండ్ ప్రారంభమవుతుంది.',
      confirmCancelBtn: 'రద్దును నిర్ధారించండి',
      refundTracker: 'నమూనా రీఫండ్ స్థితి',
      refundAmountLabel: 'అంచనా డెమో రీఫండ్',
    },
    notifications: {
      title: 'యాప్ నోటిఫికేషన్లు',
      subtitle: 'బుకింగ్స్, చెల్లింపులు, రీఫండ్‌లు మరియు రైలు సమయాల నమూనా హెచ్చరికలు.',
      simulatedBadge: 'నమూనా హెచ్చరిక',
      markAllRead: 'అన్నీ చదివినట్లు గుర్తించు',
      empty: 'నోటిఫికేషన్లు లేవు.',
    },
    profile: {
      title: 'కస్టమర్ ఖాతా',
      loginTitle: 'మొబైల్ నంబర్ లాగిన్ (డెమో OTP)',
      loginSubtitle: 'పరీక్ష కోసం నమూనా OTP కోడ్ ఉపయోగించబడుతుంది. నిజమైన SMS పంపబడదు.',
      mobileLabel: '10-అంకెల మొబైల్ నంబర్',
      mobilePlaceholder: 'ఉదా. 9876543210',
      sendOtpBtn: 'డెమో OTP పొందండి',
      otpLabel: '6-అంకెల డెమో OTP నమోదు చేయండి',
      otpHintLabel: 'నమూనా OTP (పరీక్ష కోసం)',
      verifyLoginBtn: 'ధృవీకరించి లాగిన్ అవ్వండి',
      nameLabel: 'పూర్తి పేరు',
      emailLabel: 'ఈమెయిల్ (ఐచ్ఛికం)',
      saveProfileBtn: 'ప్రొఫైల్ సేవ్ చేయండి',
      logoutBtn: 'లాగ్ అవుట్',
      demoAuthDisclaimer: 'ఇది కేవలం డెమో లాగిన్ మాత్రమే. నిజమైన SMS ధృవీకరణ లేదు.',
    },
    settings: {
      title: 'సెట్టింగ్స్ & ఆర్కిటెక్చర్',
      subtitle: 'భాష, కాన్ఫిగర్ చేయగల యాప్ పేరు, డెమో ధరలు మరియు భవిష్యత్ API సిద్ధత.',
      languageSection: 'భాష / Language',
      appNameSection: 'యాప్ పేరు ప్లేస్‌హోల్డర్',
      pricingSection: 'డెమో ధర నియమాలు',
      futureArchitectureSection: 'భవిష్యత్ అడ్మిన్, ఓనర్ & అధికారిక రైల్వే API సిద్ధత',
    },
  },
};
