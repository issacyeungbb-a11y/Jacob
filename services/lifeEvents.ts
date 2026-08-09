// 成長軌跡事件：將散喺各處嘅記錄，整合成一條「發生過咩事」嘅時間線。
// 除咗家長手動記低嘅成長點滴，仲會由現有記錄自動推導出「第一次」。

import {
  BabyLog, LogType, FeedType, DiaperType,
  FeedLog, SleepLog, HealthLog, MilestoneLog, OtherLog, VaccineLog, PumpLog, TummyTimeLog, DiaperLog,
} from '../types';
import { HK_VACCINES, MILESTONES } from '../constants';
import { getBirthDate } from './config';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** 事件分類，決定網格顏色同圖示底色 */
export type LifeTone = 'moment' | 'vaccine' | 'growth' | 'first';

export interface LifeEvent {
  key: string;
  ts: string;
  icon: string;
  title: string;
  desc?: string;
  tone: LifeTone;
  log?: BabyLog;
}

/** 網格上顏色嘅優先次序：成長點滴最搶眼，因為呢個係成長點滴頁 */
export const TONE_ORDER: LifeTone[] = ['moment', 'first', 'vaccine', 'growth'];

export const TONE_STYLE: Record<LifeTone, { label: string; cell: string; dot: string; bubble: string }> = {
  moment:  { label: '成長點滴', cell: 'bg-purple-500', dot: 'bg-purple-500', bubble: 'bg-purple-50' },
  first:   { label: '第一次',   cell: 'bg-amber-500',  dot: 'bg-amber-500',  bubble: 'bg-amber-50' },
  vaccine: { label: '疫苗',     cell: 'bg-red-500',    dot: 'bg-red-500',    bubble: 'bg-red-50' },
  growth:  { label: '身體數據', cell: 'bg-teal-500',   dot: 'bg-teal-500',   bubble: 'bg-teal-50' },
};

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const hhmm = (ts: string | number) => {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const durationCn = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}小時` : `${h}小時${m}分`;
};

/** 本地日期 YYYY-MM-DD（唔可以用 toISOString，嗰個係 UTC） */
export const localDateStr = (d: Date) => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
};

/** 出生後年齡 */
export const ageAt = (ts: string) => {
  const diff = new Date(ts).getTime() - getBirthDate().getTime();
  if (diff < 0) return { months: -1, label: '出生前' };
  const days = Math.floor(diff / DAY_MS);
  const months = Math.floor(days / 30.4375);
  const rem = Math.floor(days % 30.4375);
  return { months, label: months === 0 ? `${rem}天` : `${months}個月${rem > 0 ? ` ${rem}天` : ''}` };
};

/** 一句講清楚呢條記錄係咩 */
export const describeLog = (log: BabyLog): string => {
  switch (log.type) {
    case LogType.FEED: {
      const f = log as FeedLog;
      if (f.feedType === FeedType.SOLIDS) {
        return `副食品 · ${f.solidFoodName || '未命名'}${f.solidFoodAmount ? ` ${f.solidFoodAmount}` : ''}`;
      }
      return `${f.feedType}${f.amountMl ? ` ${f.amountMl}ml` : ''}`;
    }
    case LogType.DIAPER: return `換片 · ${(log as DiaperLog).status}`;
    case LogType.SLEEP: return `瞓咗 ${durationCn((log as SleepLog).durationMinutes || 0)}`;
    case LogType.PUMP: {
      const p = log as PumpLog;
      return `泵奶 ${p.amountMl || 0}ml · ${durationCn(p.durationMinutes || 0)}`;
    }
    case LogType.MILESTONE: {
      const m = log as MilestoneLog;
      if (m.title) return `${m.emoji || '✨'} ${m.title}`;
      const matched = m.milestoneId ? MILESTONES.find(x => x.id === m.milestoneId) : null;
      return matched ? `🏆 ${matched.name}` : '✨ 特別瞬間';
    }
    case LogType.HEALTH: {
      const h = log as HealthLog;
      const parts = [
        h.weightKg ? `${h.weightKg}kg` : '',
        h.heightCm ? `${h.heightCm}cm` : '',
        h.headCircumferenceCm ? `頭圍 ${h.headCircumferenceCm}cm` : '',
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : '身體數據';
    }
    case LogType.VACCINE: {
      const v = log as VaccineLog;
      return `💉 ${HK_VACCINES.find(x => x.id === v.vaccineId)?.name || v.vaccineId}`;
    }
    case LogType.TUMMY_TIME: return `趴趴 ${durationCn((log as TummyTimeLog).durationMinutes || 0)}`;
    case LogType.OTHER: return (log as OtherLog).details || '其他記錄';
    case LogType.SUMMARY: return '每日總結';
    default: return '記錄';
  }
};

/** 成長點滴嘅顯示用 emoji + 標題（舊記錄可能只有 milestoneId） */
export const momentDisplay = (log: MilestoneLog) => {
  if (log.title || log.emoji) {
    return { emoji: log.emoji || '✨', title: log.title || '特別瞬間' };
  }
  if (log.milestoneId) {
    const matched = MILESTONES.find(x => x.id === log.milestoneId);
    return { emoji: '🏆', title: matched ? `[${matched.category}] ${matched.name}` : '里程碑紀錄' };
  }
  return { emoji: '✨', title: '特別瞬間' };
};

/**
 * 由全部記錄推導成長軌跡事件，最新排先。
 * 包含：手動記低嘅成長點滴、疫苗、身體數據（附同上次比較），
 * 以及自動偵測嘅第一次（每款副食品、第一次瞓足 5 個鐘、第一次泵奶）。
 */
export const deriveLifeEvents = (logs: BabyLog[]): LifeEvent[] => {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const items: LifeEvent[] = [];

  // 家長親手記低嘅成長點滴
  sorted.filter((l): l is MilestoneLog => l.type === LogType.MILESTONE).forEach(m => {
    const { emoji, title } = momentDisplay(m);
    items.push({ key: `m-${m.id}`, ts: m.timestamp, icon: emoji, title, desc: m.notes, tone: 'moment', log: m });
  });

  // 疫苗
  sorted.filter((l): l is VaccineLog => l.type === LogType.VACCINE).forEach(v => {
    items.push({
      key: `v-${v.id}`, ts: v.timestamp, icon: '💉',
      title: `接種 ${HK_VACCINES.find(x => x.id === v.vaccineId)?.name || v.vaccineId}`,
      desc: v.notes, tone: 'vaccine', log: v,
    });
  });

  // 身體數據（同對上一次有磅過嘅比較）
  const healths = sorted.filter((l): l is HealthLog => l.type === LogType.HEALTH);
  healths.forEach((h, i) => {
    const prev = [...healths.slice(0, i)].reverse().find(x => x.weightKg);
    const delta = h.weightKg && prev?.weightKg ? h.weightKg - prev.weightKg : null;
    const bits = [
      h.weightKg ? `體重 ${h.weightKg}kg` : '',
      h.heightCm ? `身高 ${h.heightCm}cm` : '',
      h.headCircumferenceCm ? `頭圍 ${h.headCircumferenceCm}cm` : '',
    ].filter(Boolean).join(' · ');
    items.push({
      key: `h-${h.id}`, ts: h.timestamp, icon: '📏', title: bits || '身體數據',
      desc: delta !== null
        ? `較上次${delta >= 0 ? '增加' : '減少'} ${Math.abs(delta).toFixed(2)}kg`
        : h.notes,
      tone: 'growth', log: h,
    });
  });

  // 自動偵測：每款副食品嘅第一次
  const seenFood = new Set<string>();
  sorted.filter((l): l is FeedLog => l.type === LogType.FEED).forEach(f => {
    const name = f.solidFoodName?.trim();
    if (!name || seenFood.has(name)) return;
    seenFood.add(name);
    items.push({
      key: `f-${f.id}`, ts: f.timestamp, icon: '🥣',
      title: `第一次食${name}`, desc: '由餵食記錄自動偵測', tone: 'first', log: f,
    });
  });

  // 自動偵測：第一次瞓足 5 個鐘（睡眠記錄嘅時間係「起身」，要減返時長先知幾時瞓著）
  const firstLongSleep = sorted
    .filter((l): l is SleepLog => l.type === LogType.SLEEP)
    .find(l => (l.durationMinutes || 0) >= 300);
  if (firstLongSleep) {
    const end = new Date(firstLongSleep.timestamp).getTime();
    const start = end - (firstLongSleep.durationMinutes || 0) * 60000;
    items.push({
      key: `s-${firstLongSleep.id}`, ts: firstLongSleep.timestamp, icon: '😴',
      title: '第一次瞓足五個鐘',
      desc: `由 ${hhmm(start)} 一覺瞓到 ${hhmm(end)}（${durationCn(firstLongSleep.durationMinutes || 0)}）`,
      tone: 'first', log: firstLongSleep,
    });
  }

  // 自動偵測：媽媽第一次泵奶
  const firstPump = sorted.find((l): l is PumpLog => l.type === LogType.PUMP);
  if (firstPump) {
    items.push({
      key: `p-${firstPump.id}`, ts: firstPump.timestamp, icon: '🍼',
      title: '媽媽第一次泵奶',
      desc: `${firstPump.amountMl || 0}ml · ${durationCn(firstPump.durationMinutes || 0)}`,
      tone: 'first', log: firstPump,
    });
  }

  return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
};

export { DiaperType };
