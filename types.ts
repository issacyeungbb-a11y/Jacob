
export enum LogType {
  FEED = 'FEED',
  DIAPER = 'DIAPER',
  SLEEP = 'SLEEP',
  HEALTH = 'HEALTH',
  OTHER = 'OTHER',
  SUMMARY = 'SUMMARY' // New Log Type
}

export enum FeedType {
  BREAST = '母乳',
  FORMULA = '配方奶',
  SOLIDS = '副食品'
}

export enum DiaperType {
  WET = '小便',
  DIRTY = '大便',
  BOTH = '大小便'
}

export type SleepQuality = 'GOOD' | 'OK' | 'BAD';

export interface BaseLog {
  id: string;
  timestamp: string; // ISO String
  type: LogType;
  notes?: string;
}

export interface FeedLog extends BaseLog {
  type: LogType.FEED;
  amountMl: number;
  feedType: FeedType;
}

export interface DiaperLog extends BaseLog {
  type: LogType.DIAPER;
  status: DiaperType;
}

export interface SleepLog extends BaseLog {
  type: LogType.SLEEP;
  durationMinutes: number;
  quality?: SleepQuality; 
}

export interface HealthLog extends BaseLog {
  type: LogType.HEALTH;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
}

export interface SummaryLog extends BaseLog {
  type: LogType.SUMMARY;
  rating: 1 | 2 | 3 | 4 | 5;
  nightWakings: number;
  mood: 'HAPPY' | 'NORMAL' | 'FUSSY';
  approxSleepHours: number;
}

export interface OtherLog extends BaseLog {
  type: LogType.OTHER;
  details: string;
}

export type BabyLog = FeedLog | DiaperLog | SleepLog | HealthLog | OtherLog | SummaryLog;

export interface DailySummary {
  date: string;
  totalMilk: number;
  totalSleep: number;
  diaperCount: number;
}
