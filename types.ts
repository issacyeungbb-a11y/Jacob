
export enum LogType {
  FEED = 'FEED',
  DIAPER = 'DIAPER',
  SLEEP = 'SLEEP',
  HEALTH = 'HEALTH',
  OTHER = 'OTHER',
  SUMMARY = 'SUMMARY', // New Log Type
  TUMMY_TIME = 'TUMMY_TIME',
  VACCINE = 'VACCINE',
  MILESTONE = 'MILESTONE',
  PUMP = 'PUMP',
  WEEKLY_AI_REPORT = 'WEEKLY_AI_REPORT'
}

export enum FeedType {
  BREAST = '母乳',
  DIRECT = '親餵',   // 埋身餵哺（直接哺乳），奶量為估計值
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
  amountMl?: number;
  feedType: FeedType;
  solidFoodName?: string;
  solidFoodAmount?: string;
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

export interface TummyTimeLog extends BaseLog {
  type: LogType.TUMMY_TIME;
  durationMinutes: number;
}

// 母親泵奶記錄：泵咗幾耐（分鐘）＋泵咗幾多（ml）
export interface PumpLog extends BaseLog {
  type: LogType.PUMP;
  durationMinutes: number;
  amountMl: number;
}

export interface VaccineLog extends BaseLog {
  type: LogType.VACCINE;
  vaccineId: string;
}

// 成長點滴嘅分類。頭五個刻意同 constants.ts 嘅 MILESTONES（CDC 發展指標）
// 用同一套名，令記低嘅事可以直接對返「里程碑對照指引」。
export type MomentCategory =
  | '大肌肉' | '細肌肉' | '語言/溝通' | '社交/情緒' | '認知'
  | '生活體驗' | '健康護理' | '其他';

export interface MilestoneLog extends BaseLog {
  type: LogType.MILESTONE;
  milestoneId?: string;
  title?: string;
  emoji?: string;
  category?: MomentCategory;
}

export interface WeeklyAIReport {
  id: string; // week number or date string
  weekNum: number;
  dateRange: string;
  content: string;
  createdAt: string;
}

export type BabyLog = FeedLog | DiaperLog | SleepLog | HealthLog | OtherLog | SummaryLog | TummyTimeLog | VaccineLog | MilestoneLog | PumpLog;

export interface DailySummary {
  date: string;
  totalMilk: number;
  totalSleep: number;
  diaperCount: number;
}
