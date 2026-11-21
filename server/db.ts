import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { generateCoachSeatDefinitions } from '../src/utils/coachLayouts';
import { DEFAULT_PRICING_RULES } from '../src/utils/fareCalculator';
import type { CoachType, Station, TrainStop } from '../src/types/railway';

export const AP_TS_STATIONS: Station[] = [
  { code: 'SC', nameEn: 'Secunderabad Jn', nameTe: 'సికింద్రాబాద్ జం.', city: 'Hyderabad', state: 'TS' },
  { code: 'HYB', nameEn: 'Hyderabad Deccan', nameTe: 'హైదరాబాద్ దక్కన్', city: 'Hyderabad', state: 'TS' },
  { code: 'KCG', nameEn: 'Kacheguda', nameTe: 'కాచిగూడ', city: 'Hyderabad', state: 'TS' },
  { code: 'WL', nameEn: 'Warangal', nameTe: 'వరంగల్', city: 'Warangal', state: 'TS' },
  { code: 'KZJ', nameEn: 'Kazipet Jn', nameTe: 'కాజీపేట జం.', city: 'Kazipet', state: 'TS' },
  { code: 'KMT', nameEn: 'Khammam', nameTe: 'ఖమ్మం', city: 'Khammam', state: 'TS' },
  { code: 'NZB', nameEn: 'Nizamabad Jn', nameTe: 'నిజామాబాద్ జం.', city: 'Nizamabad', state: 'TS' },
  { code: 'KRMR', nameEn: 'Karimnagar', nameTe: 'కరీంనగర్', city: 'Karimnagar', state: 'TS' },
  { code: 'BZA', nameEn: 'Vijayawada Jn', nameTe: 'విజయవాడ జం.', city: 'Vijayawada', state: 'AP' },
  { code: 'VSKP', nameEn: 'Visakhapatnam Jn', nameTe: 'విశాఖపట్నం జం.', city: 'Visakhapatnam', state: 'AP' },
  { code: 'TPTY', nameEn: 'Tirupati', nameTe: 'తిరుపతి', city: 'Tirupati', state: 'AP' },
  { code: 'GNT', nameEn: 'Guntur Jn', nameTe: 'గుంటూరు జం.', city: 'Guntur', state: 'AP' },
  { code: 'RJY', nameEn: 'Rajahmundry', nameTe: 'రాజమండ్రి', city: 'Rajahmundry', state: 'AP' },
  { code: 'EE', nameEn: 'Eluru', nameTe: 'ఏలూరు', city: 'Eluru', state: 'AP' },
  { code: 'NLR', nameEn: 'Nellore', nameTe: 'నెల్లూరు', city: 'Nellore', state: 'AP' },
  { code: 'OGL', nameEn: 'Ongole', nameTe: 'ఒంగోలు', city: 'Ongole', state: 'AP' },
  { code: 'KDP', nameEn: 'Kadapa', nameTe: 'కడప', city: 'Kadapa', state: 'AP' },
  { code: 'ATP', nameEn: 'Anantapur', nameTe: 'అనంతపురం', city: 'Anantapur', state: 'AP' },
  { code: 'GTL', nameEn: 'Guntakal Jn', nameTe: 'గుంతకల్ జం.', city: 'Guntakal', state: 'AP' },
  { code: 'KNL', nameEn: 'Kurnool City', nameTe: 'కర్నూలు సిటీ', city: 'Kurnool', state: 'AP' },
  { code: 'VZM', nameEn: 'Vizianagaram Jn', nameTe: 'విజయనగరం జం.', city: 'Vizianagaram', state: 'AP' },
  { code: 'SKM', nameEn: 'Srikakulam Road', nameTe: 'శ్రీకాకుళం రోడ్', city: 'Srikakulam', state: 'AP' },
];

export interface TrainSeedSpec {
  id: string;
  trainNumber: string;
  nameEn: string;
  nameTe: string;
  runningDays: string[];
  coaches: Array<{ code: string; type: CoachType }>;
  stops: TrainStop[];
}

export const DEMO_TRAINS: TrainSeedSpec[] = [
  {
    id: 'TR-12728',
    trainNumber: '12728',
    nameEn: 'Godavari Superfast Express',
    nameTe: 'గోదావరి సూపర్‌ఫాస్ట్ ఎక్స్‌ప్రెస్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'S2', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'B2', type: '3A' },
      { code: 'A1', type: '2A' },
      { code: 'H1', type: '1A' },
    ],
    stops: [
      { stationCode: 'HYB', arrivalTime: null, departureTime: '17:00', distanceKm: 0, dayOffset: 0, platform: '1' },
      { stationCode: 'SC', arrivalTime: '17:15', departureTime: '17:25', distanceKm: 10, dayOffset: 0, platform: '4' },
      { stationCode: 'KZJ', arrivalTime: '19:08', departureTime: '19:10', distanceKm: 142, dayOffset: 0, platform: '2' },
      { stationCode: 'WL', arrivalTime: '19:22', departureTime: '19:25', distanceKm: 152, dayOffset: 0, platform: '1' },
      { stationCode: 'KMT', arrivalTime: '20:42', departureTime: '20:44', distanceKm: 259, dayOffset: 0, platform: '2' },
      { stationCode: 'BZA', arrivalTime: '22:15', departureTime: '22:25', distanceKm: 360, dayOffset: 0, platform: '6' },
      { stationCode: 'EE', arrivalTime: '23:12', departureTime: '23:14', distanceKm: 420, dayOffset: 0, platform: '1' },
      { stationCode: 'RJY', arrivalTime: '00:35', departureTime: '00:40', distanceKm: 509, dayOffset: 1, platform: '2' },
      { stationCode: 'VSKP', arrivalTime: '04:55', departureTime: null, distanceKm: 710, dayOffset: 1, platform: '3' },
    ],
  },
  {
    id: 'TR-20834',
    trainNumber: '20834',
    nameEn: 'Deccan Coastal Express (Demo)',
    nameTe: 'దక్కన్ కోస్టల్ ఎక్స్‌ప్రెస్ (డెమో)',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'B1', type: '3A' },
      { code: 'B2', type: '3A' },
      { code: 'A1', type: '2A' },
      { code: 'H1', type: '1A' },
    ],
    stops: [
      { stationCode: 'SC', arrivalTime: null, departureTime: '05:05', distanceKm: 0, dayOffset: 0, platform: '10' },
      { stationCode: 'WL', arrivalTime: '06:35', departureTime: '06:37', distanceKm: 142, dayOffset: 0, platform: '1' },
      { stationCode: 'KMT', arrivalTime: '07:45', departureTime: '07:47', distanceKm: 249, dayOffset: 0, platform: '1' },
      { stationCode: 'BZA', arrivalTime: '09:10', departureTime: '09:15', distanceKm: 350, dayOffset: 0, platform: '1' },
      { stationCode: 'RJY', arrivalTime: '11:02', departureTime: '11:04', distanceKm: 499, dayOffset: 0, platform: '1' },
      { stationCode: 'VSKP', arrivalTime: '13:35', departureTime: null, distanceKm: 700, dayOffset: 0, platform: '1' },
    ],
  },
  {
    id: 'TR-12704',
    trainNumber: '12704',
    nameEn: 'Falaknuma Superfast',
    nameTe: 'ఫలక్‌నుమా సూపర్‌ఫాస్ట్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'S2', type: 'SL' },
      { code: 'S3', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'A1', type: '2A' },
    ],
    stops: [
      { stationCode: 'SC', arrivalTime: null, departureTime: '15:55', distanceKm: 0, dayOffset: 0, platform: '2' },
      { stationCode: 'GNT', arrivalTime: '20:10', departureTime: '20:15', distanceKm: 295, dayOffset: 0, platform: '3' },
      { stationCode: 'BZA', arrivalTime: '21:05', departureTime: '21:15', distanceKm: 327, dayOffset: 0, platform: '4' },
      { stationCode: 'EE', arrivalTime: '22:05', departureTime: '22:07', distanceKm: 387, dayOffset: 0, platform: '2' },
      { stationCode: 'RJY', arrivalTime: '23:25', departureTime: '23:30', distanceKm: 476, dayOffset: 0, platform: '1' },
      { stationCode: 'VSKP', arrivalTime: '03:20', departureTime: null, distanceKm: 677, dayOffset: 1, platform: '5' },
      { stationCode: 'VZM', arrivalTime: '04:30', departureTime: '04:35', distanceKm: 738, dayOffset: 1, platform: '2' },
      { stationCode: 'SKM', arrivalTime: '05:25', departureTime: null, distanceKm: 807, dayOffset: 1, platform: '1' },
    ],
  },
  {
    id: 'TR-12740',
    trainNumber: '12740',
    nameEn: 'Visakha Night Express',
    nameTe: 'విశాఖ నైట్ ఎక్స్‌ప్రెస్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'S1', type: 'SL' },
      { code: 'S2', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'B2', type: '3A' },
      { code: 'A1', type: '2A' },
      { code: 'H1', type: '1A' },
    ],
    stops: [
      { stationCode: 'SC', arrivalTime: null, departureTime: '21:15', distanceKm: 0, dayOffset: 0, platform: '7' },
      { stationCode: 'WL', arrivalTime: '23:05', departureTime: '23:08', distanceKm: 142, dayOffset: 0, platform: '2' },
      { stationCode: 'BZA', arrivalTime: '02:20', departureTime: '02:30', distanceKm: 350, dayOffset: 1, platform: '3' },
      { stationCode: 'RJY', arrivalTime: '04:30', departureTime: '04:35', distanceKm: 499, dayOffset: 1, platform: '2' },
      { stationCode: 'VSKP', arrivalTime: '08:10', departureTime: null, distanceKm: 700, dayOffset: 1, platform: '4' },
    ],
  },
  {
    id: 'TR-12734',
    trainNumber: '12734',
    nameEn: 'Narayanadri Superfast',
    nameTe: 'నారాయణాద్రి సూపర్‌ఫాస్ట్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'S2', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'A1', type: '2A' },
      { code: 'H1', type: '1A' },
    ],
    stops: [
      { stationCode: 'SC', arrivalTime: null, departureTime: '18:05', distanceKm: 0, dayOffset: 0, platform: '5' },
      { stationCode: 'GNT', arrivalTime: '22:15', departureTime: '22:20', distanceKm: 285, dayOffset: 0, platform: '1' },
      { stationCode: 'OGL', arrivalTime: '00:15', departureTime: '00:17', distanceKm: 416, dayOffset: 1, platform: '2' },
      { stationCode: 'NLR', arrivalTime: '01:55', departureTime: '01:57', distanceKm: 533, dayOffset: 1, platform: '1' },
      { stationCode: 'TPTY', arrivalTime: '05:30', departureTime: null, distanceKm: 678, dayOffset: 1, platform: '2' },
    ],
  },
  {
    id: 'TR-12794',
    trainNumber: '12794',
    nameEn: 'Rayalaseema Express',
    nameTe: 'రాయలసీమ ఎక్స్‌ప్రెస్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'S2', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'A1', type: '2A' },
    ],
    stops: [
      { stationCode: 'NZB', arrivalTime: null, departureTime: '14:00', distanceKm: 0, dayOffset: 0, platform: '1' },
      { stationCode: 'SC', arrivalTime: '16:50', departureTime: '17:10', distanceKm: 161, dayOffset: 0, platform: '3' },
      { stationCode: 'HYB', arrivalTime: '17:25', departureTime: '17:35', distanceKm: 171, dayOffset: 0, platform: '2' },
      { stationCode: 'KCG', arrivalTime: '17:50', departureTime: '18:00', distanceKm: 180, dayOffset: 0, platform: '1' },
      { stationCode: 'KNL', arrivalTime: '21:55', departureTime: '21:58', distanceKm: 414, dayOffset: 0, platform: '1' },
      { stationCode: 'GTL', arrivalTime: '00:15', departureTime: '00:25', distanceKm: 535, dayOffset: 1, platform: '4' },
      { stationCode: 'ATP', arrivalTime: '01:35', departureTime: '01:37', distanceKm: 603, dayOffset: 1, platform: '1' },
      { stationCode: 'KDP', arrivalTime: '03:50', departureTime: '03:52', distanceKm: 752, dayOffset: 1, platform: '2' },
      { stationCode: 'TPTY', arrivalTime: '06:45', departureTime: null, distanceKm: 882, dayOffset: 1, platform: '1' },
    ],
  },
  {
    id: 'TR-17202',
    trainNumber: '17202',
    nameEn: 'Golconda Intercity Express',
    nameTe: 'గోల్కొండ ఇంటర్‌సిటీ ఎక్స్‌ప్రెస్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'G2', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'B1', type: '3A' },
    ],
    stops: [
      { stationCode: 'SC', arrivalTime: null, departureTime: '13:05', distanceKm: 0, dayOffset: 0, platform: '8' },
      { stationCode: 'KZJ', arrivalTime: '15:05', departureTime: '15:07', distanceKm: 132, dayOffset: 0, platform: '1' },
      { stationCode: 'WL', arrivalTime: '15:20', departureTime: '15:22', distanceKm: 142, dayOffset: 0, platform: '3' },
      { stationCode: 'KMT', arrivalTime: '16:50', departureTime: '16:52', distanceKm: 249, dayOffset: 0, platform: '1' },
      { stationCode: 'BZA', arrivalTime: '18:45', departureTime: '18:55', distanceKm: 350, dayOffset: 0, platform: '5' },
      { stationCode: 'GNT', arrivalTime: '19:45', departureTime: null, distanceKm: 382, dayOffset: 0, platform: '2' },
    ],
  },
  {
    id: 'TR-12727',
    trainNumber: '12727',
    nameEn: 'Godavari Return Express',
    nameTe: 'గోదావరి రిటర్న్ ఎక్స్‌ప్రెస్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'S2', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'A1', type: '2A' },
      { code: 'H1', type: '1A' },
    ],
    stops: [
      { stationCode: 'VSKP', arrivalTime: null, departureTime: '17:20', distanceKm: 0, dayOffset: 0, platform: '2' },
      { stationCode: 'RJY', arrivalTime: '20:20', departureTime: '20:25', distanceKm: 201, dayOffset: 0, platform: '1' },
      { stationCode: 'EE', arrivalTime: '21:35', departureTime: '21:37', distanceKm: 290, dayOffset: 0, platform: '1' },
      { stationCode: 'BZA', arrivalTime: '22:55', departureTime: '23:05', distanceKm: 350, dayOffset: 0, platform: '7' },
      { stationCode: 'KMT', arrivalTime: '00:28', departureTime: '00:30', distanceKm: 451, dayOffset: 1, platform: '1' },
      { stationCode: 'WL', arrivalTime: '02:05', departureTime: '02:08', distanceKm: 558, dayOffset: 1, platform: '2' },
      { stationCode: 'SC', arrivalTime: '05:15', departureTime: '05:25', distanceKm: 700, dayOffset: 1, platform: '1' },
      { stationCode: 'HYB', arrivalTime: '05:50', departureTime: null, distanceKm: 710, dayOffset: 1, platform: '4' },
    ],
  },
  {
    id: 'TR-17406',
    trainNumber: '17406',
    nameEn: 'Krishna Express',
    nameTe: 'కృష్ణా ఎక్స్‌ప్రెస్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'S2', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'A1', type: '2A' },
    ],
    stops: [
      { stationCode: 'TPTY', arrivalTime: null, departureTime: '05:45', distanceKm: 0, dayOffset: 0, platform: '3' },
      { stationCode: 'NLR', arrivalTime: '08:15', departureTime: '08:17', distanceKm: 145, dayOffset: 0, platform: '2' },
      { stationCode: 'OGL', arrivalTime: '09:50', departureTime: '09:52', distanceKm: 262, dayOffset: 0, platform: '1' },
      { stationCode: 'GNT', arrivalTime: '11:45', departureTime: '11:50', distanceKm: 393, dayOffset: 0, platform: '1' },
      { stationCode: 'BZA', arrivalTime: '12:40', departureTime: '12:55', distanceKm: 425, dayOffset: 0, platform: '2' },
      { stationCode: 'WL', arrivalTime: '16:15', departureTime: '16:18', distanceKm: 633, dayOffset: 0, platform: '1' },
      { stationCode: 'SC', arrivalTime: '19:20', departureTime: null, distanceKm: 775, dayOffset: 0, platform: '6' },
    ],
  },
  {
    id: 'TR-12764',
    trainNumber: '12764',
    nameEn: 'Padmavathi Express',
    nameTe: 'పద్మావతి ఎక్స్‌ప్రెస్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'S1', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'B2', type: '3A' },
      { code: 'A1', type: '2A' },
    ],
    stops: [
      { stationCode: 'SC', arrivalTime: null, departureTime: '18:40', distanceKm: 0, dayOffset: 0, platform: '9' },
      { stationCode: 'WL', arrivalTime: '20:30', departureTime: '20:32', distanceKm: 142, dayOffset: 0, platform: '2' },
      { stationCode: 'BZA', arrivalTime: '23:45', departureTime: '23:55', distanceKm: 350, dayOffset: 0, platform: '4' },
      { stationCode: 'OGL', arrivalTime: '01:55', departureTime: '01:57', distanceKm: 488, dayOffset: 1, platform: '1' },
      { stationCode: 'NLR', arrivalTime: '03:20', departureTime: '03:22', distanceKm: 605, dayOffset: 1, platform: '2' },
      { stationCode: 'TPTY', arrivalTime: '06:55', departureTime: null, distanceKm: 750, dayOffset: 1, platform: '4' },
    ],
  },
  {
    id: 'TR-12718',
    trainNumber: '12718',
    nameEn: 'Ratnachal Intercity',
    nameTe: 'రత్నాచల్ ఇంటర్‌సిటీ',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'B1', type: '3A' },
    ],
    stops: [
      { stationCode: 'VSKP', arrivalTime: null, departureTime: '12:55', distanceKm: 0, dayOffset: 0, platform: '1' },
      { stationCode: 'RJY', arrivalTime: '15:40', departureTime: '15:42', distanceKm: 201, dayOffset: 0, platform: '2' },
      { stationCode: 'EE', arrivalTime: '16:50', departureTime: '16:52', distanceKm: 290, dayOffset: 0, platform: '1' },
      { stationCode: 'BZA', arrivalTime: '18:10', departureTime: null, distanceKm: 350, dayOffset: 0, platform: '3' },
    ],
  },
  {
    id: 'TR-17014',
    trainNumber: '17014',
    nameEn: 'Telangana Express Connector',
    nameTe: 'తెలంగాణ ఎక్స్‌ప్రెస్ కనెక్టర్',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [
      { code: 'G1', type: 'GS' },
      { code: 'S1', type: 'SL' },
      { code: 'B1', type: '3A' },
      { code: 'A1', type: '2A' },
    ],
    stops: [
      { stationCode: 'KRMR', arrivalTime: null, departureTime: '07:15', distanceKm: 0, dayOffset: 0, platform: '1' },
      { stationCode: 'KZJ', arrivalTime: '08:55', departureTime: '09:05', distanceKm: 108, dayOffset: 0, platform: '3' },
      { stationCode: 'WL', arrivalTime: '09:18', departureTime: '09:20', distanceKm: 118, dayOffset: 0, platform: '2' },
      { stationCode: 'SC', arrivalTime: '11:45', departureTime: null, distanceKm: 260, dayOffset: 0, platform: '2' },
    ],
  },
];

let dbInstance: DatabaseSync | null = null;

export function createDatabase(dbPath: string): DatabaseSync {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_te TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trains (
      id TEXT PRIMARY KEY,
      train_number TEXT NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_te TEXT NOT NULL,
      running_days_json TEXT NOT NULL,
      stops_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coaches (
      id TEXT PRIMARY KEY,
      train_id TEXT NOT NULL,
      coach_code TEXT NOT NULL,
      coach_type TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      total_seats INTEGER NOT NULL,
      FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      train_id TEXT NOT NULL,
      journey_date TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      berth_type TEXT NOT NULL,
      bay_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      held_by_session TEXT,
      hold_expires_at INTEGER,
      booked_pnr TEXT,
      UNIQUE(coach_id, journey_date, seat_number)
    );

    CREATE INDEX IF NOT EXISTS idx_seats_lookup
      ON seats (train_id, coach_id, journey_date);

    CREATE TABLE IF NOT EXISTS pricing_config (
      coach_type TEXT PRIMARY KEY,
      label_en TEXT NOT NULL,
      label_te TEXT NOT NULL,
      base_fare REAL NOT NULL,
      per_km_rate REAL NOT NULL,
      reservation_fee REAL NOT NULL,
      gst_percent REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      mobile TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otp_challenges (
      mobile TEXT PRIMARY KEY,
      otp_code TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mobile TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      pnr TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT NOT NULL,
      train_id TEXT NOT NULL,
      train_number TEXT NOT NULL,
      train_name_en TEXT NOT NULL,
      train_name_te TEXT NOT NULL,
      from_code TEXT NOT NULL,
      from_name_en TEXT NOT NULL,
      to_code TEXT NOT NULL,
      to_name_en TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      journey_date TEXT NOT NULL,
      coach_id TEXT NOT NULL,
      coach_code TEXT NOT NULL,
      coach_type TEXT NOT NULL,
      seat_numbers_json TEXT NOT NULL,
      passengers_json TEXT NOT NULL,
      status TEXT NOT NULL,
      payment_method TEXT,
      payment_status TEXT NOT NULL,
      fare_per_seat REAL NOT NULL,
      total_fare REAL NOT NULL,
      hold_expires_at INTEGER,
      refund_status TEXT NOT NULL,
      refund_amount REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      type TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_te TEXT NOT NULL,
      message_en TEXT NOT NULL,
      message_te TEXT NOT NULL,
      is_simulated INTEGER NOT NULL DEFAULT 1,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  seedStaticData(db);
  return db;
}

function seedStaticData(db: DatabaseSync): void {
  const insertStation = db.prepare(`
    INSERT OR IGNORE INTO stations (code, name_en, name_te, city, state)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const s of AP_TS_STATIONS) {
    insertStation.run(s.code, s.nameEn, s.nameTe, s.city, s.state);
  }

  const insertPricing = db.prepare(`
    INSERT OR IGNORE INTO pricing_config (coach_type, label_en, label_te, base_fare, per_km_rate, reservation_fee, gst_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const rule of Object.values(DEFAULT_PRICING_RULES)) {
    insertPricing.run(
      rule.coachType,
      rule.labelEn,
      rule.labelTe,
      rule.baseFare,
      rule.perKmRate,
      rule.reservationFee,
      rule.gstPercent
    );
  }

  const insertTrain = db.prepare(`
    INSERT OR IGNORE INTO trains (id, train_number, name_en, name_te, running_days_json, stops_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertCoach = db.prepare(`
    INSERT OR IGNORE INTO coaches (id, train_id, coach_code, coach_type, sort_order, total_seats)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const train of DEMO_TRAINS) {
    insertTrain.run(
      train.id,
      train.trainNumber,
      train.nameEn,
      train.nameTe,
      JSON.stringify(train.runningDays),
      JSON.stringify(train.stops)
    );
    train.coaches.forEach((coach, idx) => {
      const seatCount = generateCoachSeatDefinitions(coach.type).length;
      const coachId = `${train.id}-${coach.code}`;
      insertCoach.run(coachId, train.id, coach.code, coach.type, idx + 1, seatCount);
    });
  }

  // Seed initial demo notifications & historical/upcoming sample bookings once
  const existingNotifCount = db.prepare('SELECT COUNT(*) as cnt FROM notifications').get() as { cnt: number };
  if (existingNotifCount.cnt === 0) {
    const now = Date.now();
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, session_id, type, title_en, title_te, message_en, message_te, is_simulated, read, created_at)
      VALUES (?, NULL, 'DEMO-GLOBAL', ?, ?, ?, ?, ?, 1, 0, ?)
    `);
    insertNotif.run(
      'NTF-SEED-1',
      'TRAIN_DELAY',
      'Simulated Schedule Update: 12728 Godavari Express',
      'నమూనా సమయ మార్పు: 12728 గోదావరి ఎక్స్‌ప్రెస్',
      'Demo Alert: Train 12728 is running on time from Secunderabad Platform 4.',
      'డెమో హెచ్చరిక: రైలు 12728 సికింద్రాబాద్ ప్లాట్‌ఫారమ్ 4 నుండి సమయానికి నడుస్తోంది.',
      now - 3600_000
    );
    insertNotif.run(
      'NTF-SEED-2',
      'PLATFORM_CHANGE',
      'Simulated Platform Notice: 12734 Narayanadri Express',
      'నమూనా ప్లాట్‌ఫారమ్ సమాచారం: 12734 నారాయణాద్రి ఎక్స్‌ప్రెస్',
      'Demo Alert: Coach B1 & A1 positioned near Foot Overbridge East at Secunderabad (Platform 5).',
      'డెమో హెచ్చరిక: కోచ్ B1 & A1 సికింద్రాబాద్ ప్లాట్‌ఫారమ్ 5 తూర్పు వంతెన వద్ద ఉంటాయి.',
      now - 1800_000
    );
    insertNotif.run(
      'NTF-SEED-3',
      'JOURNEY_REMINDER',
      'Demo Journey Reminder: AP & Telangana MVP',
      'డెమో ప్రయాణ గుర్తు: AP & తెలంగాణ MVP',
      'Remember to test the 15-minute seat hold, simulated payment outcomes, and E-Ticket PDF export.',
      '15-నిమిషాల సీట్ హోల్డ్, నమూనా చెల్లింపు మరియు PDF టికెట్ డౌన్‌లోడ్‌ను పరీక్షించండి.',
      now - 900_000
    );
  }

  const existingBookingsCount = db.prepare('SELECT COUNT(*) as cnt FROM bookings').get() as { cnt: number };
  if (existingBookingsCount.cnt === 0) {
    const now = Date.now();
    const pastDate = new Date(now - 5 * 86400_000).toISOString().slice(0, 10);
    const futureDate = new Date(now + 4 * 86400_000).toISOString().slice(0, 10);

    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        pnr, user_id, session_id, train_id, train_number, train_name_en, train_name_te,
        from_code, from_name_en, to_code, to_name_en, departure_time, arrival_time, journey_date,
        coach_id, coach_code, coach_type, seat_numbers_json, passengers_json, status,
        payment_method, payment_status, fare_per_seat, total_fare, hold_expires_at,
        refund_status, refund_amount, created_at, updated_at
      ) VALUES (?, NULL, 'DEMO-GLOBAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `);

    insertBooking.run(
      'DM84920145',
      'TR-12728',
      '12728',
      'Godavari Superfast Express',
      'గోదావరి సూపర్‌ఫాస్ట్ ఎక్స్‌ప్రెస్',
      'SC',
      'Secunderabad Jn',
      'VSKP',
      'Visakhapatnam Jn',
      '17:25',
      '04:55',
      pastDate,
      'TR-12728-B1',
      'B1',
      '3A',
      JSON.stringify([12, 13]),
      JSON.stringify([
        { seatNumber: 12, berthType: 'LB', fullName: 'Ramesh Varma', age: '34', gender: 'Male' },
        { seatNumber: 13, berthType: 'MB', fullName: 'Lakshmi Varma', age: '30', gender: 'Female' },
      ]),
      'CONFIRMED',
      'UPI',
      'SUCCESS',
      1265,
      2530,
      'NOT_APPLICABLE',
      0,
      now - 7 * 86400_000,
      now - 7 * 86400_000
    );

    insertBooking.run(
      'DM77310924',
      'TR-12734',
      '12734',
      'Narayanadri Superfast',
      'నారాయణాద్రి సూపర్‌ఫాస్ట్',
      'SC',
      'Secunderabad Jn',
      'TPTY',
      'Tirupati',
      '18:05',
      '05:30',
      futureDate,
      'TR-12734-A1',
      'A1',
      '2A',
      JSON.stringify([7]),
      JSON.stringify([
        { seatNumber: 7, berthType: 'LB', fullName: 'Srinivas Rao', age: '42', gender: 'Male' },
      ]),
      'CANCELLED',
      'PHONEPE',
      'SUCCESS',
      1880,
      1880,
      'REFUNDED',
      1680,
      now - 2 * 86400_000,
      now - 1 * 86400_000
    );
  }
}

export function ensureSeatsForCoachDate(
  db: DatabaseSync,
  trainId: string,
  coachId: string,
  coachType: CoachType,
  journeyDate: string
): void {
  const existing = db
    .prepare('SELECT COUNT(*) as cnt FROM seats WHERE coach_id = ? AND journey_date = ?')
    .get(coachId, journeyDate) as { cnt: number };

  if (existing.cnt > 0) {
    return;
  }

  const defs = generateCoachSeatDefinitions(coachType);
  // Deterministic occupancy hash based on coachId + seatNumber + date so every reload sees identical consistent seat statuses
  const seedHash = (coachId + journeyDate)
    .split('')
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 997, 7);

  const insertSeat = db.prepare(`
    INSERT OR IGNORE INTO seats (
      id, coach_id, train_id, journey_date, seat_number, berth_type, bay_number,
      status, held_by_session, hold_expires_at, booked_pnr
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
  `);

  db.exec('BEGIN');
  try {
    for (const def of defs) {
      const n = (def.seatNumber * 17 + seedHash) % 23;
      let status: 'AVAILABLE' | 'BOOKED' | 'WAITING_LIST' = 'AVAILABLE';
      if (n < 7) {
        status = 'BOOKED';
      } else if (n === 7 || n === 8) {
        status = 'WAITING_LIST';
      }
      const seatId = `${coachId}_${journeyDate}_${def.seatNumber}`;
      insertSeat.run(
        seatId,
        coachId,
        trainId,
        journeyDate,
        def.seatNumber,
        def.berthType,
        def.bayNumber,
        status
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = path.resolve(process.cwd(), 'data', 'rail_demo.db');
    dbInstance = createDatabase(dbPath);
  }
  return dbInstance;
}
