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
let activeDbPathLabel = 'data/rail_demo.db';

function getTableColumns(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>).map(
      (r) => r.version
    )
  );

  if (!applied.has(1)) {
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

    db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
      1,
      'initial_core_schema',
      Date.now()
    );
  }

  if (!applied.has(2)) {
    const userCols = getTableColumns(db, 'users');
    if (!userCols.has('password_hash')) {
      db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;');
    }
    if (!userCols.has('role')) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer';");
    }
    if (!userCols.has('is_verified')) {
      db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0;');
    }
    if (!userCols.has('is_active')) {
      db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;');
    }
    if (!userCols.has('updated_at')) {
      db.exec('ALTER TABLE users ADD COLUMN updated_at INTEGER;');
    }
    if (!userCols.has('last_login_at')) {
      db.exec('ALTER TABLE users ADD COLUMN last_login_at INTEGER;');
    }

    const sessionCols = getTableColumns(db, 'sessions');
    if (!sessionCols.has('token_hash')) {
      db.exec('ALTER TABLE sessions ADD COLUMN token_hash TEXT;');
    }
    if (!sessionCols.has('user_agent')) {
      db.exec("ALTER TABLE sessions ADD COLUMN user_agent TEXT DEFAULT '';");
    }
    if (!sessionCols.has('ip_address')) {
      db.exec("ALTER TABLE sessions ADD COLUMN ip_address TEXT DEFAULT '';");
    }
    if (!sessionCols.has('revoked_at')) {
      db.exec('ALTER TABLE sessions ADD COLUMN revoked_at INTEGER;');
    }

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
        ON users (lower(email)) WHERE email != '';

      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
        ON sessions (token_hash);

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
        ON sessions (user_id);

      CREATE TABLE IF NOT EXISTS verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        target TEXT NOT NULL,
        purpose TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_verification_lookup
        ON verification_tokens (target, purpose, expires_at);

      CREATE TABLE IF NOT EXISTS passenger_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        berth_preference TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_passenger_profiles_user
        ON passenger_profiles (user_id);

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        pnr TEXT NOT NULL,
        user_id TEXT,
        gateway TEXT NOT NULL,
        gateway_order_id TEXT,
        gateway_payment_id TEXT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL,
        raw_status TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_pnr
        ON transactions (pnr);

      CREATE INDEX IF NOT EXISTS idx_transactions_order_id
        ON transactions (gateway_order_id);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        actor_label TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        metadata_json TEXT,
        ip_address TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_created
        ON audit_logs (created_at DESC);

      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_bookings_user
        ON bookings (user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_bookings_session
        ON bookings (session_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_bookings_status_date
        ON bookings (status, journey_date);

      CREATE INDEX IF NOT EXISTS idx_notifications_user
        ON notifications (user_id, read, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_notifications_session
        ON notifications (session_id, read, created_at DESC);
    `);

    db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
      2,
      'auth_rbac_transactions_audit_config',
      Date.now()
    );
  }
}

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
  db.exec('PRAGMA busy_timeout = 5000;');

  runMigrations(db);
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

  const now = Date.now();
  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO app_config (key, value, updated_at)
    VALUES (?, ?, ?)
  `);
  insertConfig.run('app_name', 'TRAINSYNK', now);
  insertConfig.run('support_email', 'support@trainsynk.in', now);
  insertConfig.run('hold_duration_minutes', '15', now);
  insertConfig.run('max_seats_per_booking', '6', now);
  insertConfig.run('maintenance_mode', 'false', now);

  const existingTrainsCount = db.prepare('SELECT COUNT(*) as cnt FROM trains').get() as { cnt: number };
  if (existingTrainsCount.cnt === 0) {
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
  }

  const existingNotifCount = db.prepare('SELECT COUNT(*) as cnt FROM notifications').get() as { cnt: number };
  if (existingNotifCount.cnt === 0) {
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, session_id, type, title_en, title_te, message_en, message_te, is_simulated, read, created_at)
      VALUES (?, NULL, 'DEMO-GLOBAL', ?, ?, ?, ?, ?, 0, 0, ?)
    `);
    insertNotif.run(
      'NTF-SEED-1',
      'TRAIN_DELAY',
      'Schedule Notice: 12728 Godavari Superfast Express',
      'సమయ సమాచారం: 12728 గోదావరి సూపర్‌ఫాస్ట్ ఎక్స్‌ప్రెస్',
      'Train 12728 is scheduled on time from Secunderabad Jn Platform 4.',
      'రైలు 12728 సికింద్రాబాద్ జం. ప్లాట్‌ఫారమ్ 4 నుండి సమయానికి బయలుదేరుతుంది.',
      now - 3600_000
    );
    insertNotif.run(
      'NTF-SEED-2',
      'PLATFORM_CHANGE',
      'Coach Position: 12734 Narayanadri Superfast',
      'కోచ్ స్థానం: 12734 నారాయణాద్రి సూపర్‌ఫాస్ట్',
      'Coaches B1 & A1 positioned near Foot Overbridge East at Secunderabad Platform 5.',
      'కోచ్‌లు B1 & A1 సికింద్రాబాద్ ప్లాట్‌ఫారమ్ 5 తూర్పు వంతెన వద్ద ఉంటాయి.',
      now - 1800_000
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

export function getDbPathLabel(): string {
  return activeDbPathLabel;
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const configured = process.env.DATABASE_PATH?.trim();
    const dbPath = configured
      ? path.resolve(configured)
      : path.resolve(process.cwd(), 'data', 'rail_demo.db');
    activeDbPathLabel = path.relative(process.cwd(), dbPath) || dbPath;
    dbInstance = createDatabase(dbPath);
  }
  return dbInstance;
}
