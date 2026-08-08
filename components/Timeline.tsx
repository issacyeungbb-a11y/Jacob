import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  BabyLog, LogType, FeedType, DiaperType,
  FeedLog, SleepLog, DiaperLog, HealthLog, MilestoneLog, OtherLog, VaccineLog, PumpLog, TummyTimeLog,
} from '../types';
import { HK_VACCINES, MILESTONES } from '../constants';
import { BABY_NAME, getBirthDate } from '../services/config';
import {
  Clock, CalendarDays, Baby, ChevronLeft, ChevronRight, X, Pencil, Trash2, Check,
  Moon, AlertTriangle,
} from 'lucide-react';

interface TimelineProps {
  logs: BabyLog[];
  onDeleteLog: (id: string) => void;
  onUpdateLog: (log: BabyLog) => void;
}

type Mode = 'DAY' | 'WEEK' | 'LIFE';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_PX = 40;              // 日檢視每小時高度
const DAY_PX = 24 * HOUR_PX;     // 全日軸高度
const CHIP_GAP = 26;             // 事件卡最小間距，用嚟自動錯開

// 每種記錄嘅顯示樣式（色點、標籤、卡片配色）
const META: Record<string, { label: string; dot: string; chip: string }> = {
  [LogType.FEED]:       { label: '餵奶',   dot: 'bg-amber-500',   chip: 'text-amber-700' },
  [LogType.DIAPER]:     { label: '換片',   dot: 'bg-emerald-500', chip: 'text-emerald-700' },
  [LogType.SLEEP]:      { label: '睡眠',   dot: 'bg-indigo-500',  chip: 'text-indigo-700' },
  [LogType.PUMP]:       { label: '泵奶',   dot: 'bg-purple-500',  chip: 'text-purple-700' },
  [LogType.MILESTONE]:  { label: '成長點滴', dot: 'bg-rose-500',  chip: 'text-rose-700' },
  [LogType.HEALTH]:     { label: '身體數據', dot: 'bg-teal-500',  chip: 'text-teal-700' },
  [LogType.VACCINE]:    { label: '疫苗',   dot: 'bg-red-500',     chip: 'text-red-700' },
  [LogType.TUMMY_TIME]: { label: '趴趴時間', dot: 'bg-sky-500',   chip: 'text-sky-700' },
  [LogType.OTHER]:      { label: '其他',   dot: 'bg-slate-400',   chip: 'text-slate-600' },
  [LogType.SUMMARY]:    { label: '每日總結', dot: 'bg-gray-400',  chip: 'text-gray-600' },
};

const MOOD_OPTIONS = [
  { emoji: '😊', label: '開心' }, { emoji: '🥰', label: '撒嬌' },
  { emoji: '😮', label: '好奇' }, { emoji: '😢', label: '扭計' },
  { emoji: '😴', label: '累了' }, { emoji: '🤪', label: '搞怪' },
  { emoji: '❤️', label: '得意' },
];

const localDateStr = (d: Date) => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
};
const startOfDay = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const pad2 = (n: number) => String(n).padStart(2, '0');
const hhmm = (ts: string | number) => {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const durationCn = (mins: number) => {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}小時` : `${h}小時${m}分`;
};

// 一句講清楚呢條記錄係咩，日檢視同彈窗共用
const describe = (log: BabyLog): string => {
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

export const Timeline: React.FC<TimelineProps> = ({ logs, onDeleteLog, onUpdateLog }) => {
  const [mode, setMode] = useState<Mode>('DAY');
  const [dateStr, setDateStr] = useState(() => localDateStr(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const sorted = useMemo(
    () => [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [logs],
  );

  // ── 睡眠：記錄嘅 timestamp 係「起身」時間，瞓著時間要減返時長 ────────────
  // 回傳實際 [瞓著, 起身] 毫秒區間，跨夜嘅稍後再按日切割。
  const sleepSpans = useMemo(() => {
    return sorted
      .filter((l): l is SleepLog => l.type === LogType.SLEEP)
      .map(l => {
        const end = new Date(l.timestamp).getTime();
        const mins = Math.max(0, l.durationMinutes || 0);
        return { log: l, start: end - mins * 60000, end };
      })
      .filter(s => s.end > s.start);
  }, [sorted]);

  // 某一日之內嘅睡眠片段（跨夜會被切開，唔會漏）
  const sleepSlicesFor = useCallback((day: string) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = dayStart + DAY_MS;
    return sleepSpans
      .filter(s => s.end > dayStart && s.start < dayEnd)
      .map(s => {
        const from = Math.max(s.start, dayStart);
        const to = Math.min(s.end, dayEnd);
        return {
          log: s.log,
          fromMin: (from - dayStart) / 60000,
          toMin: (to - dayStart) / 60000,
          clippedStart: s.start < dayStart,
          clippedEnd: s.end > dayEnd,
          fullMinutes: (s.end - s.start) / 60000,
        };
      })
      .sort((a, b) => a.fromMin - b.fromMin);
  }, [sleepSpans]);

  const logsOn = useCallback(
    (day: string) => sorted.filter(l => localDateStr(new Date(l.timestamp)) === day),
    [sorted],
  );

  // ── 日檢視 ──────────────────────────────────────────────────────────────
  const daySlices = useMemo(() => sleepSlicesFor(dateStr), [sleepSlicesFor, dateStr]);

  // 睡眠以色帶表示，唔再喺右邊重複出一張卡
  const dayEvents = useMemo(() => {
    const dayStart = startOfDay(dateStr).getTime();
    const items = logsOn(dateStr)
      .filter(l => l.type !== LogType.SLEEP && l.type !== LogType.SUMMARY)
      .map(l => ({ log: l, min: (new Date(l.timestamp).getTime() - dayStart) / 60000 }))
      .sort((a, b) => a.min - b.min);

    // 時間太近就順序推落去，避免卡片疊住
    let lastTop = -Infinity;
    return items.map(it => {
      let top = (it.min / 1440) * DAY_PX;
      if (top < lastTop + CHIP_GAP) top = lastTop + CHIP_GAP;
      lastTop = top;
      return { ...it, top };
    });
  }, [logsOn, dateStr]);

  const dayStats = useMemo(() => {
    const dayLogs = logsOn(dateStr);
    const feeds = dayLogs.filter((l): l is FeedLog => l.type === LogType.FEED);
    const sleepMins = daySlices.reduce((s, x) => s + (x.toMin - x.fromMin), 0);
    // 夜醒＝凌晨 0–6 點之間結束、而之後又有得瞓返嘅睡眠段
    const nightWakes = daySlices.filter(s => s.toMin > 0 && s.toMin < 360 && !s.clippedEnd).length;
    return {
      sleepHrs: (sleepMins / 60).toFixed(1),
      ml: feeds.reduce((s, f) => s + (f.amountMl || 0), 0),
      diapers: dayLogs.filter(l => l.type === LogType.DIAPER).length,
      nightWakes,
    };
  }, [logsOn, dateStr, daySlices]);

  const dayList = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return localDateStr(d);
    });
  }, []);

  // ── 週檢視：七日各壓成一條橫帶 ────────────────────────────────────────
  const weekRows = useMemo(() => {
    const rows = dayList.map(day => {
      const slices = sleepSlicesFor(day);
      const dayStart = startOfDay(day).getTime();
      const feeds = logsOn(day)
        .filter(l => l.type === LogType.FEED)
        .map(l => ((new Date(l.timestamp).getTime() - dayStart) / 60000 / 1440) * 100);
      const sleepMins = slices.reduce((s, x) => s + (x.toMin - x.fromMin), 0);
      const nightWakes = slices.filter(s => s.toMin > 0 && s.toMin < 360 && !s.clippedEnd).length;
      return { day, slices, feeds, sleepHrs: sleepMins / 60, nightWakes };
    });
    const withData = rows.filter(r => r.slices.length || r.feeds.length);
    const avgWake = withData.length
      ? withData.reduce((s, r) => s + r.nightWakes, 0) / withData.length
      : 0;
    // 夜醒最少 2 次、而且明顯高過當週平均先當異常；
    // 若果成個星期都咁多次（即係常態），就唔會標任何一日。
    return rows.map(r => ({ ...r, isOutlier: r.nightWakes >= 2 && r.nightWakes >= avgWake + 0.75 }));
  }, [dayList, sleepSlicesFor, logsOn]);

  const weekStats = useMemo(() => {
    const active = weekRows.filter(r => r.slices.length || r.feeds.length);
    if (!active.length) return null;
    const dayStartOf = (d: string) => startOfDay(d).getTime();
    const totalMl = active.reduce((s, r) => {
      return s + logsOn(r.day)
        .filter((l): l is FeedLog => l.type === LogType.FEED)
        .reduce((t, f) => t + (f.amountMl || 0), 0);
    }, 0);
    void dayStartOf;
    return {
      avgSleep: (active.reduce((s, r) => s + r.sleepHrs, 0) / active.length).toFixed(1),
      avgMl: Math.round(totalMl / active.length),
      avgWake: (active.reduce((s, r) => s + r.nightWakes, 0) / active.length).toFixed(1),
    };
  }, [weekRows, logsOn]);

  // ── 一生檢視：大事＋自動偵測嘅「第一次」 ──────────────────────────────
  const ageAt = useCallback((ts: string) => {
    const diff = new Date(ts).getTime() - getBirthDate().getTime();
    if (diff < 0) return { months: -1, label: '出生前' };
    const days = Math.floor(diff / DAY_MS);
    const months = Math.floor(days / 30.4375);
    const rem = Math.floor(days % 30.4375);
    return { months, label: months === 0 ? `${rem}天` : `${months}個月${rem > 0 ? ` ${rem}天` : ''}` };
  }, []);

  type LifeItem = {
    key: string; ts: string; icon: string; title: string; desc?: string;
    tone: 'moment' | 'vaccine' | 'growth' | 'first'; log?: BabyLog;
  };

  const lifeItems = useMemo(() => {
    const items: LifeItem[] = [];

    // 你親手記低嘅成長點滴
    sorted.filter((l): l is MilestoneLog => l.type === LogType.MILESTONE).forEach(m => {
      const matched = m.milestoneId ? MILESTONES.find(x => x.id === m.milestoneId) : null;
      items.push({
        key: `m-${m.id}`, ts: m.timestamp, icon: m.emoji || (matched ? '🏆' : '✨'),
        title: m.title || matched?.name || '特別瞬間', desc: m.notes,
        tone: 'moment', log: m,
      });
    });

    // 疫苗
    sorted.filter((l): l is VaccineLog => l.type === LogType.VACCINE).forEach(v => {
      items.push({
        key: `v-${v.id}`, ts: v.timestamp, icon: '💉',
        title: `接種 ${HK_VACCINES.find(x => x.id === v.vaccineId)?.name || v.vaccineId}`,
        desc: v.notes, tone: 'vaccine', log: v,
      });
    });

    // 身體數據（同對上一次比較）
    const healths = sorted.filter((l): l is HealthLog => l.type === LogType.HEALTH);
    healths.forEach((h, i) => {
      const prev = [...healths.slice(0, i)].reverse().find(x => x.weightKg);
      const delta = (h.weightKg && prev?.weightKg)
        ? h.weightKg - prev.weightKg
        : null;
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
        title: `第一次食${name}`, desc: '由餵食記錄自動偵測',
        tone: 'first', log: f,
      });
    });

    // 自動偵測：第一次瞓足 5 個鐘
    const longSleep = sleepSpans.find(s => (s.end - s.start) / 60000 >= 300);
    if (longSleep) {
      items.push({
        key: `s-${longSleep.log.id}`, ts: longSleep.log.timestamp, icon: '😴',
        title: '第一次瞓足五個鐘',
        desc: `由 ${hhmm(longSleep.start)} 一覺瞓到 ${hhmm(longSleep.end)}（${durationCn((longSleep.end - longSleep.start) / 60000)}）`,
        tone: 'first', log: longSleep.log,
      });
    }

    // 自動偵測：第一次泵奶
    const firstPump = sorted.find((l): l is PumpLog => l.type === LogType.PUMP);
    if (firstPump) {
      items.push({
        key: `p-${firstPump.id}`, ts: firstPump.timestamp, icon: '🍼',
        title: '媽媽第一次泵奶', desc: `${firstPump.amountMl || 0}ml · ${durationCn(firstPump.durationMinutes || 0)}`,
        tone: 'first', log: firstPump,
      });
    }

    return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [sorted, sleepSpans]);

  const lifeGrouped = useMemo(() => {
    const map = new Map<number, LifeItem[]>();
    lifeItems.forEach(it => {
      const m = ageAt(it.ts).months;
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(it);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [lifeItems, ageAt]);

  // ── 詳情彈窗 ────────────────────────────────────────────────────────────
  const selected = selectedId ? logs.find(l => l.id === selectedId) || null : null;

  const closeModal = useCallback(() => { setSelectedId(null); setIsEditing(false); }, []);

  useEffect(() => {
    if (selectedId && !selected) closeModal();
  }, [selectedId, selected, closeModal]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [selected, closeModal]);

  const startEdit = () => {
    if (!selected) return;
    const d: Record<string, string> = { notes: selected.notes || '' };
    switch (selected.type) {
      case LogType.FEED: {
        const f = selected as FeedLog;
        d.amountMl = String(f.amountMl ?? '');
        d.solidFoodName = f.solidFoodName || '';
        break;
      }
      case LogType.SLEEP: d.durationMinutes = String((selected as SleepLog).durationMinutes ?? ''); break;
      case LogType.TUMMY_TIME: d.durationMinutes = String((selected as TummyTimeLog).durationMinutes ?? ''); break;
      case LogType.PUMP: {
        const p = selected as PumpLog;
        d.amountMl = String(p.amountMl ?? '');
        d.durationMinutes = String(p.durationMinutes ?? '');
        break;
      }
      case LogType.DIAPER: d.status = (selected as DiaperLog).status; break;
      case LogType.HEALTH: {
        const h = selected as HealthLog;
        d.weightKg = String(h.weightKg ?? '');
        d.heightCm = String(h.heightCm ?? '');
        d.headCircumferenceCm = String(h.headCircumferenceCm ?? '');
        break;
      }
      case LogType.MILESTONE: {
        const m = selected as MilestoneLog;
        d.title = m.title || '';
        d.emoji = m.emoji || '✨';
        break;
      }
      case LogType.OTHER: d.details = (selected as OtherLog).details || ''; break;
    }
    setDraft(d);
    setIsEditing(true);
  };

  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const saveEdit = () => {
    if (!selected) return;
    const updated: any = { ...selected, notes: draft.notes?.trim() || undefined };
    switch (selected.type) {
      case LogType.FEED:
        if ((selected as FeedLog).feedType === FeedType.SOLIDS) {
          updated.solidFoodName = draft.solidFoodName?.trim() || undefined;
        } else {
          updated.amountMl = num(draft.amountMl) ?? 0;
        }
        break;
      case LogType.SLEEP:
      case LogType.TUMMY_TIME:
        updated.durationMinutes = num(draft.durationMinutes) ?? 0;
        break;
      case LogType.PUMP:
        updated.amountMl = num(draft.amountMl) ?? 0;
        updated.durationMinutes = num(draft.durationMinutes) ?? 0;
        break;
      case LogType.DIAPER:
        updated.status = draft.status as DiaperType;
        break;
      case LogType.HEALTH:
        updated.weightKg = num(draft.weightKg);
        updated.heightCm = num(draft.heightCm);
        updated.headCircumferenceCm = num(draft.headCircumferenceCm);
        break;
      case LogType.MILESTONE:
        if (!draft.title?.trim()) return;
        updated.title = draft.title.trim();
        updated.emoji = draft.emoji;
        break;
      case LogType.OTHER:
        updated.details = draft.details?.trim() || '';
        break;
    }
    onUpdateLog(updated as BabyLog);
    setIsEditing(false);
  };

  const removeSelected = () => {
    if (!selected) return;
    if (!window.confirm('確定要刪除這條記錄嗎？')) return;
    onDeleteLog(selected.id);
    closeModal();
  };

  const shiftDay = (delta: number) => {
    const d = startOfDay(dateStr);
    d.setDate(d.getDate() + delta);
    setDateStr(localDateStr(d));
  };

  const isToday = dateStr === localDateStr(new Date());
  const weekdayCn = (day: string) => ['日', '一', '二', '三', '四', '五', '六'][startOfDay(day).getDay()];

  // 日期列預設會停喺最左，選中嗰日（通常係今日）會跌出畫面右邊 —— 捲返佢入中間。
  // 直接改 scrollLeft 而唔用 scrollIntoView，免得順手拉埋成版嘢。
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== 'DAY') return;
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>(`[data-day="${dateStr}"]`);
    if (!strip || !chip) return;
    strip.scrollLeft = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
  }, [mode, dateStr]);

  const field = (key: string, label: string, opts: { suffix?: string; step?: string } = {}) => (
    <div key={key}>
      <label className="block text-[11px] font-bold text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={opts.step || '1'}
          value={draft[key] ?? ''}
          onChange={e => setDraft({ ...draft, [key]: e.target.value })}
          className="flex-1 min-w-0 p-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold text-gray-800"
        />
        {opts.suffix && <span className="text-xs text-gray-400 font-bold flex-shrink-0">{opts.suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── 標題 + 模式切換 ─────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            時間軸
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {mode === 'DAY' && `${startOfDay(dateStr).toLocaleDateString('zh-HK', { month: 'long', day: 'numeric' })} 星期${weekdayCn(dateStr)}${isToday ? ' · 今日' : ''}`}
            {mode === 'WEEK' && '最近 7 日作息'}
            {mode === 'LIFE' && `${BABY_NAME} 出世到今日`}
          </p>
        </div>
        <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1 flex-shrink-0">
          {([['DAY', '日'], ['WEEK', '週'], ['LIFE', '一生']] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ 日檢視 ══════════ */}
      {mode === 'DAY' && (
        <>
          {/* 日期選擇 */}
          <div className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-2">
            <button onClick={() => shiftDay(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0" aria-label="前一日">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div ref={stripRef} className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
              {dayList.map(day => {
                const on = day === dateStr;
                return (
                  <button
                    key={day}
                    data-day={day}
                    onClick={() => setDateStr(day)}
                    className={`flex-shrink-0 w-11 py-1.5 rounded-xl border text-center transition-colors ${
                      on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'
                    }`}
                  >
                    <span className={`block text-[9px] ${on ? 'text-blue-100' : 'text-gray-400'}`}>{weekdayCn(day)}</span>
                    <span className="block text-sm font-black">{startOfDay(day).getDate()}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => shiftDay(1)}
              disabled={isToday}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 disabled:opacity-25"
              aria-label="後一日"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* 當日摘要 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: dayStats.sleepHrs, l: '睡眠小時', c: 'text-indigo-600' },
              { v: dayStats.ml, l: '奶量 ml', c: 'text-amber-600' },
              { v: dayStats.diapers, l: '換片', c: 'text-emerald-600' },
              { v: dayStats.nightWakes, l: '夜醒', c: 'text-rose-500' },
            ].map(s => (
              <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm py-2.5 text-center">
                <p className={`text-lg font-black leading-none ${s.c}`}>{s.v}</p>
                <p className="text-[9px] text-gray-400 mt-1">{s.l}</p>
              </div>
            ))}
          </div>

          {/* 24 小時軸 */}
          <div className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100">
            {daySlices.length === 0 && dayEvents.length === 0 ? (
              <div className="text-center py-12 px-4">
                <span className="text-3xl block mb-2 select-none">🗓️</span>
                <p className="text-sm font-bold text-gray-500">呢日未有任何記錄</p>
                <p className="text-xs text-gray-400 mt-1">揀第二日,或者返「儀表板」新增記錄。</p>
              </div>
            ) : (
              <div className="relative" style={{ height: DAY_PX }}>
                {/* 每 2 小時一條格線 */}
                {Array.from({ length: 12 }, (_, i) => i * 2).map(h => (
                  <div key={h} className="absolute left-0 right-0 flex items-center gap-2 pointer-events-none" style={{ top: h * HOUR_PX }}>
                    <span className="text-[9px] text-gray-300 w-6 text-right font-mono tabular-nums flex-shrink-0">{pad2(h)}</span>
                    <span className="flex-1 h-px bg-gray-100" />
                  </div>
                ))}

                {/* 睡眠色帶 */}
                <div className="absolute left-8 top-0 bottom-0 w-3.5 bg-slate-100 rounded-full" />
                {daySlices.map((s, i) => {
                  const top = (s.fromMin / 1440) * DAY_PX;
                  const height = Math.max(4, ((s.toMin - s.fromMin) / 1440) * DAY_PX);
                  return (
                    <button
                      key={`${s.log.id}-${i}`}
                      onClick={() => setSelectedId(s.log.id)}
                      className="absolute left-8 w-3.5 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700 hover:brightness-110 transition-all"
                      style={{ top, height }}
                      title={`瞓咗 ${durationCn(s.fullMinutes)}`}
                    >
                      {height >= 30 && (
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-600 whitespace-nowrap tabular-nums">
                          {durationCn(s.toMin - s.fromMin)}
                          {(s.clippedStart || s.clippedEnd) && <span className="text-indigo-300"> ↕</span>}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* 事件 */}
                {dayEvents.map(({ log, min, top }) => {
                  const meta = META[log.type] || META[LogType.OTHER];
                  const isMoment = log.type === LogType.MILESTONE;
                  const dayStart = startOfDay(dateStr).getTime();
                  return (
                    <button
                      key={log.id}
                      onClick={() => setSelectedId(log.id)}
                      className="absolute flex items-center gap-1.5 h-[22px]"
                      style={{ top, left: 62, right: 4 }}
                    >
                      <span className="text-[9px] text-gray-300 font-mono tabular-nums w-7 flex-shrink-0 text-left">
                        {hhmm(dayStart + min * 60000)}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-lg border text-[10.5px] font-bold whitespace-nowrap max-w-full overflow-hidden transition-colors ${
                        isMoment
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                        <span className="truncate">{describe(log)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 圖例 */}
            <div className="flex flex-wrap gap-2.5 pt-3 mt-1 border-t border-gray-50">
              {[LogType.SLEEP, LogType.FEED, LogType.DIAPER, LogType.PUMP, LogType.MILESTONE].map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[9px] text-gray-400">
                  <span className={`w-2 h-2 rounded-sm ${META[t].dot}`} />
                  {META[t].label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══════════ 週檢視 ══════════ */}
      {mode === 'WEEK' && (
        <>
          {weekStats && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: weekStats.avgSleep, l: '平均睡眠時數', c: 'text-indigo-600' },
                { v: weekStats.avgMl, l: '平均奶量 ml', c: 'text-amber-600' },
                { v: weekStats.avgWake, l: '平均夜醒', c: 'text-rose-500' },
              ].map(s => (
                <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm py-2.5 text-center">
                  <p className={`text-lg font-black leading-none ${s.c}`}>{s.v}</p>
                  <p className="text-[9px] text-gray-400 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100">
            {/* 小時刻度 */}
            <div className="flex ml-9 mb-1.5 text-[8.5px] text-gray-300 font-mono tabular-nums">
              {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                <span key={h} className="flex-1">{h}</span>
              ))}
            </div>

            {weekRows.map(row => (
              <div key={row.day} className="mb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setDateStr(row.day); setMode('DAY'); }}
                    className="w-8 flex-shrink-0 text-right"
                  >
                    <span className="block text-[9px] text-gray-500 font-mono tabular-nums leading-tight">
                      {startOfDay(row.day).getMonth() + 1}/{startOfDay(row.day).getDate()}
                    </span>
                    <span className="block text-[8px] text-gray-300">{weekdayCn(row.day)}</span>
                  </button>
                  <button
                    onClick={() => { setDateStr(row.day); setMode('DAY'); }}
                    className={`relative flex-1 h-7 rounded-md border overflow-hidden transition-colors ${
                      row.isOutlier ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-gray-100 hover:border-blue-200'
                    }`}
                    title={`${row.sleepHrs.toFixed(1)} 小時睡眠 · 夜醒 ${row.nightWakes} 次`}
                  >
                    {row.slices.map((s, i) => (
                      <span
                        key={i}
                        className="absolute top-0 h-4 bg-gradient-to-b from-indigo-500 to-indigo-700"
                        style={{ left: `${(s.fromMin / 1440) * 100}%`, width: `${Math.max(0.4, ((s.toMin - s.fromMin) / 1440) * 100)}%` }}
                      />
                    ))}
                    {row.feeds.map((pct, i) => (
                      <span
                        key={`f${i}`}
                        className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-500"
                        style={{ left: `${pct}%` }}
                      />
                    ))}
                  </button>
                </div>
                {row.isOutlier && (
                  <div className="flex items-center gap-1 ml-9 mt-0.5 text-[9px] text-rose-500 font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    夜醒 {row.nightWakes} 次 · 較平日多
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2.5 pt-3 mt-1 border-t border-gray-50">
              <span className="inline-flex items-center gap-1.5 text-[9px] text-gray-400">
                <span className="w-2 h-2 rounded-sm bg-indigo-600" />睡眠時段
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />每次餵奶
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] text-gray-400">
                <span className="w-2 h-2 rounded-sm bg-rose-200" />夜醒偏多嘅一日
              </span>
              <span className="text-[9px] text-gray-300 ml-auto">撳任何一行 → 睇嗰日詳情</span>
            </div>
          </div>
        </>
      )}

      {/* ══════════ 一生檢視 ══════════ */}
      {mode === 'LIFE' && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
          {lifeGrouped.length === 0 ? (
            <div className="text-center py-12 px-4">
              <span className="text-3xl block mb-2 select-none">🌱</span>
              <p className="text-sm font-bold text-gray-500">未有大事記錄</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                記低成長點滴、打針或者磅重之後,呢度就會自動串成 {BABY_NAME} 嘅成長故事。
              </p>
            </div>
          ) : (
            lifeGrouped.map(([month, items]) => (
              <div key={month} className="mb-1">
                <div className="flex items-center gap-2.5 my-3">
                  <span className="text-[10.5px] font-black text-blue-700 bg-blue-50 rounded-full px-3 py-1 border border-blue-100 whitespace-nowrap">
                    {month <= 0 ? '未滿 1 個月' : `第 ${month} 個月`}
                  </span>
                  <span className="flex-1 h-px bg-blue-100" />
                  <span className="text-[9px] text-gray-400 font-bold">{items.length} 件事</span>
                </div>

                {items.map((it, idx) => (
                  <div key={it.key} className="flex gap-2.5">
                    <div className="w-6 flex-shrink-0 flex flex-col items-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] select-none ${
                        it.tone === 'vaccine' ? 'bg-red-50' :
                        it.tone === 'growth' ? 'bg-teal-50' :
                        it.tone === 'first' ? 'bg-amber-50' : 'bg-blue-50'
                      }`}>{it.icon}</span>
                      {idx < items.length - 1 && <span className="flex-1 w-px bg-gray-100 my-1 min-h-[8px]" />}
                    </div>

                    <button
                      onClick={() => it.log && setSelectedId(it.log.id)}
                      className="flex-1 min-w-0 text-left bg-white border border-gray-100 rounded-2xl px-3 py-2 mb-2 hover:border-blue-200 transition-colors shadow-sm"
                    >
                      <p className="text-[12.5px] font-black text-gray-800 leading-snug">{it.title}</p>
                      {it.desc && (
                        <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{it.desc}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[8.5px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded tabular-nums">
                          {ageAt(it.ts).label}
                        </span>
                        <span className="text-[8.5px] text-gray-300 tabular-nums">
                          {new Date(it.ts).toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════ 詳情彈窗 ══════════ */}
      {selected && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col animate-slide-up overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex-shrink-0 relative">
              <button onClick={closeModal} className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors" aria-label="關閉">
                <X className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex items-center gap-2 pr-10">
                <span className={`w-2.5 h-2.5 rounded-full ${(META[selected.type] || META[LogType.OTHER]).dot}`} />
                <span className="text-[11px] font-black text-gray-400">{(META[selected.type] || META[LogType.OTHER]).label}</span>
              </div>
              <h3 className="text-lg font-black text-gray-800 mt-1.5 leading-snug pr-10">{describe(selected)}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-2 text-[10px] text-gray-400">
                <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  當時 {BABY_NAME} {ageAt(selected.timestamp).label}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {new Date(selected.timestamp).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                  {' '}
                  {new Date(selected.timestamp).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {selected.type === LogType.SLEEP && (() => {
                const span = sleepSpans.find(s => s.log.id === selected.id);
                return span ? (
                  <p className="text-[10px] text-indigo-500 font-bold mt-1.5 flex items-center gap-1">
                    <Moon className="w-3 h-3" />
                    {hhmm(span.start)} 瞓著 → {hhmm(span.end)} 起身
                  </p>
                ) : null;
              })()}
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {isEditing ? (
                <>
                  {selected.type === LogType.MILESTONE && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5">心情</label>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                          {MOOD_OPTIONS.map(m => (
                            <button
                              key={m.emoji}
                              onClick={() => setDraft({ ...draft, emoji: m.emoji })}
                              className={`px-2.5 py-1.5 rounded-xl flex flex-col items-center gap-0.5 border-2 flex-shrink-0 transition-all ${
                                draft.emoji === m.emoji ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50'
                              }`}
                            >
                              <span className="text-lg">{m.emoji}</span>
                              <span className="text-[9px] text-gray-500">{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">標題</label>
                        <input
                          type="text"
                          value={draft.title ?? ''}
                          onChange={e => setDraft({ ...draft, title: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold text-gray-800"
                        />
                      </div>
                    </>
                  )}

                  {selected.type === LogType.FEED && (
                    (selected as FeedLog).feedType === FeedType.SOLIDS ? (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">副食品名稱</label>
                        <input
                          type="text"
                          value={draft.solidFoodName ?? ''}
                          onChange={e => setDraft({ ...draft, solidFoodName: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold text-gray-800"
                        />
                      </div>
                    ) : field('amountMl', '奶量', { suffix: 'ml' })
                  )}

                  {selected.type === LogType.SLEEP && field('durationMinutes', '睡眠時長', { suffix: '分鐘' })}
                  {selected.type === LogType.TUMMY_TIME && field('durationMinutes', '趴趴時長', { suffix: '分鐘' })}
                  {selected.type === LogType.PUMP && (
                    <div className="grid grid-cols-2 gap-2">
                      {field('amountMl', '泵咗幾多', { suffix: 'ml' })}
                      {field('durationMinutes', '用咗幾耐', { suffix: '分鐘' })}
                    </div>
                  )}
                  {selected.type === LogType.HEALTH && (
                    <div className="grid grid-cols-3 gap-2">
                      {field('weightKg', '體重', { suffix: 'kg', step: '0.01' })}
                      {field('heightCm', '身高', { suffix: 'cm', step: '0.1' })}
                      {field('headCircumferenceCm', '頭圍', { suffix: 'cm', step: '0.1' })}
                    </div>
                  )}
                  {selected.type === LogType.DIAPER && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1.5">狀態</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.values(DiaperType).map(s => (
                          <button
                            key={s}
                            onClick={() => setDraft({ ...draft, status: s })}
                            className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${
                              draft.status === s ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-transparent bg-gray-50 text-gray-400'
                            }`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.type === LogType.OTHER && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">內容</label>
                      <input
                        type="text"
                        value={draft.details ?? ''}
                        onChange={e => setDraft({ ...draft, details: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold text-gray-800"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">備註</label>
                    <textarea
                      rows={3}
                      value={draft.notes ?? ''}
                      onChange={e => setDraft({ ...draft, notes: e.target.value })}
                      placeholder="想補充啲咩？"
                      className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm text-gray-700 leading-relaxed resize-none placeholder-gray-300"
                    />
                  </div>
                </>
              ) : selected.notes ? (
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selected.notes}</p>
              ) : (
                <p className="text-gray-300 text-sm italic text-center py-4">冇額外備註</p>
              )}
            </div>

            <div className="border-t border-gray-100 p-3 flex items-center gap-2 flex-shrink-0 bg-gray-50/50">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-100 transition-colors">
                    取消
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />儲存
                  </button>
                </>
              ) : (
                <>
                  <Baby className="w-4 h-4 text-gray-300 ml-1" />
                  <div className="flex-1" />
                  <button onClick={startEdit} className="px-3 py-2.5 rounded-xl text-blue-500 hover:bg-blue-50 font-bold text-xs flex items-center gap-1.5 transition-colors">
                    <Pencil className="w-4 h-4" />編輯
                  </button>
                  <button onClick={removeSelected} className="px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-50 font-bold text-xs flex items-center gap-1.5 transition-colors">
                    <Trash2 className="w-4 h-4" />刪除
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
