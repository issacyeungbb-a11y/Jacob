import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { BabyLog, LogType, MilestoneLog, MomentCategory } from '../types';
import { MILESTONES } from '../constants';
import { BABY_NAME, getBirthDate } from '../services/config';
import { momentDisplay, ageAt, localDateStr } from '../services/lifeEvents';
import { MOMENT_CATEGORIES, CATEGORY_MAP, inferCategory } from '../services/momentCategories';
import { LogDetailModal } from './LogDetailModal';
import {
  Flag, Sparkles, ChevronDown, ChevronUp, Calendar, Heart,
  Search, X, LayoutGrid, List, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface MilestoneTrackerProps {
  logs: BabyLog[];
  onDeleteLog: (id: string) => void;
  onUpdateLog: (log: BabyLog) => void;
}

const MOOD_OPTIONS = [
  { emoji: '😊', label: '開心' }, { emoji: '🥰', label: '撒嬌' },
  { emoji: '😮', label: '好奇' }, { emoji: '😢', label: '扭計' },
  { emoji: '😴', label: '累了' }, { emoji: '🤪', label: '搞怪' },
  { emoji: '❤️', label: '得意' },
];

// CDC 對照表用返成長點滴同一套分類色，兩邊對得返
const categoryStyle = (category: string) => {
  const hit = MOMENT_CATEGORIES.find(c => c.key === category || category.includes(c.key.split('/')[0]));
  return hit ? hit.chip : CATEGORY_MAP['認知'].chip;
};

const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ logs, onDeleteLog, onUpdateLog }) => {
  const [showReference, setShowReference] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [peekDate, setPeekDate] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<MomentCategory | null>(null);
  const [monthIdx, setMonthIdx] = useState(-1); // -1 = 未初始化，之後跳去最新一個月
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navInMoments, setNavInMoments] = useState(false);

  // ── 成長軌跡（只計家長喺「成長點滴」入面寫低嘅記錄）────────────────────
  /** 每篇點滴配返佢嘅分類（舊記錄冇欄位就由文字推斷） */
  const momentsWithCategory = useMemo(
    () => logs
      .filter((l): l is MilestoneLog => l.type === LogType.MILESTONE)
      .map(log => ({ log, category: inferCategory(log) }))
      .sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime()),
    [logs],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<MomentCategory, number>();
    momentsWithCategory.forEach(({ category }) => counts.set(category, (counts.get(category) || 0) + 1));
    return counts;
  }, [momentsWithCategory]);

  const trailMoments = useMemo(
    () => (catFilter ? momentsWithCategory.filter(m => m.category === catFilter) : momentsWithCategory),
    [momentsWithCategory, catFilter],
  );

  /** 日期 → 當日點滴 */
  const momentsByDate = useMemo(() => {
    const map = new Map<string, typeof trailMoments>();
    trailMoments.forEach(m => {
      const key = localDateStr(new Date(m.log.timestamp));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    map.forEach(list => list.sort(
      (a, b) => new Date(a.log.timestamp).getTime() - new Date(b.log.timestamp).getTime(),
    ));
    return map;
  }, [trailMoments]);

  /** 由出世個月到今個月，逐個月一版月曆 */
  const monthList = useMemo(() => {
    const birth = getBirthDate();
    const now = new Date();
    const out: { year: number; month: number }[] = [];
    const cur = new Date(birth.getFullYear(), birth.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 1);
    // 上限 240 個月，防止 BIRTH_DATE 設錯時無限迴圈
    for (let guard = 0; cur <= last && guard < 240; guard++) {
      out.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  }, []);

  const todayStr = localDateStr(new Date());
  const birthStr = localDateStr(getBirthDate());

  /** 每個月有幾多篇（月份快捷列用） */
  const monthCounts = useMemo(() => {
    const counts = new Map<string, number>();
    trailMoments.forEach(m => {
      const d = new Date(m.log.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [trailMoments]);

  /** 顯示緊嗰個月嘅日曆格（頭尾補空格對齊星期）*/
  const calendarCells = useMemo(() => {
    const { year, month } = monthList[monthIdx] || monthList[monthList.length - 1] || { year: 0, month: 1 };
    if (!year) return [];
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: ({ day: number; key: string } | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, key: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthList, monthIdx]);

  const shownMonth = monthList[monthIdx] || monthList[monthList.length - 1];
  const peekMoments = peekDate ? momentsByDate.get(peekDate) || [] : [];

  // ── 點滴札記（只計家長手寫嘅成長點滴）────────────────────────────────────
  const momentLogs = useMemo(
    () => logs
      .filter((l): l is MilestoneLog => l.type === LogType.MILESTONE)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [logs],
  );

  const filteredMoments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return momentLogs.filter(log => {
      if (moodFilter && (log.emoji || '') !== moodFilter) return false;
      if (!q) return true;
      const { title } = momentDisplay(log);
      return `${title} ${log.notes || ''}`.toLowerCase().includes(q);
    });
  }, [momentLogs, search, moodFilter]);

  const groupedMoments = useMemo(() => {
    const map = new Map<number, MilestoneLog[]>();
    filteredMoments.forEach(log => {
      const m = ageAt(log.timestamp).months;
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(log);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filteredMoments]);

  const moodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    momentLogs.forEach(l => { if (l.emoji) counts.set(l.emoji, (counts.get(l.emoji) || 0) + 1); });
    return counts;
  }, [momentLogs]);

  /** 一共有幾多日留低過記錄（唔受分類篩選影響）*/
  const recordedDays = useMemo(
    () => new Set(momentsWithCategory.map(m => localDateStr(new Date(m.log.timestamp)))).size,
    [momentsWithCategory],
  );

  const daysSinceLatest = useMemo(() => {
    if (momentLogs.length === 0) return null;
    const diff = Date.now() - new Date(momentLogs[0].timestamp).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [momentLogs]);

  // 預設打開最新一個月；monthList 長度變咗（過咗新一個月）都跟得上
  useEffect(() => {
    if (monthList.length === 0) return;
    if (monthIdx < 0 || monthIdx > monthList.length - 1) setMonthIdx(monthList.length - 1);
  }, [monthList.length, monthIdx]);

  // 月份快捷列預設停喺最左，將顯示緊嗰個月捲返入中間
  const monthStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = monthStripRef.current;
    const chip = strip?.querySelector<HTMLElement>(`[data-month="${monthIdx}"]`);
    if (!strip || !chip) return;
    strip.scrollLeft = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
  }, [monthIdx]);

  // ── 詳情彈窗 ────────────────────────────────────────────────────────────
  const selected = selectedId ? logs.find(l => l.id === selectedId) || null : null;
  const momentIndex = navInMoments && selectedId
    ? filteredMoments.findIndex(l => l.id === selectedId)
    : -1;

  const closeModal = useCallback(() => { setSelectedId(null); setNavInMoments(false); }, []);

  // 被刪走或者被篩走就自動關閉
  useEffect(() => {
    if (selectedId && !selected) closeModal();
  }, [selectedId, selected, closeModal]);

  const openMoment = (id: string) => { setSelectedId(id); setNavInMoments(true); };
  const openSingle = (id: string) => { setSelectedId(id); setNavInMoments(false); };

  const fmtShort = (ts: string) => {
    try { return new Date(ts).toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' }); }
    catch { return ''; }
  };
  const fmtTime = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const monthLabel = (m: number) => (m <= 0 ? '未滿 1 個月' : `第 ${m} 個月大`);
  const hasMoments = momentLogs.length > 0;
  const hasFilter = !!(search.trim() || moodFilter);

  const milestonesByMonth = useMemo(() => {
    const grouped: Record<number, typeof MILESTONES> = {};
    MILESTONES.forEach(m => {
      if (!grouped[m.month]) grouped[m.month] = [];
      grouped[m.month].push(m);
    });
    return grouped;
  }, []);

  return (
    <div className="space-y-6">

      {/* ── 概覽 ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-5 sm:p-6 rounded-3xl shadow-lg shadow-purple-100 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-extrabold flex items-center gap-2 text-lg sm:text-xl">
              <Sparkles className="w-5 h-5 text-purple-200" />
              成長點滴
            </h3>
            <p className="text-[11px] sm:text-xs text-purple-200 mt-1 leading-relaxed">
              {BABY_NAME} 成長路上嘅每一件事，喺同一條軌跡上面。
            </p>
          </div>
          <Heart className="w-6 h-6 text-purple-200 fill-current flex-shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-white/15 rounded-2xl px-2 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black leading-none tabular-nums">{momentLogs.length}</p>
            <p className="text-[10px] text-purple-200 mt-1.5">篇點滴</p>
          </div>
          <div className="bg-white/15 rounded-2xl px-2 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black leading-none tabular-nums">{recordedDays}</p>
            <p className="text-[10px] text-purple-200 mt-1.5">日有記錄</p>
          </div>
          <div className="bg-white/15 rounded-2xl px-2 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black leading-none tabular-nums">
              {daysSinceLatest === null ? '—' : daysSinceLatest === 0 ? '今日' : daysSinceLatest}
            </p>
            <p className="text-[10px] text-purple-200 mt-1.5">
              {daysSinceLatest === null || daysSinceLatest === 0 ? '最近記錄' : '日前記錄'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 成長軌跡：月曆 ─────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              成長軌跡
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">
              你記低嘅每一件事，落喺佢真正發生嗰一日
            </p>
          </div>
          <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full font-bold whitespace-nowrap tabular-nums">
            {trailMoments.length} 篇
          </span>
        </div>

        {momentsWithCategory.length === 0 ? (
          <div className="text-center py-10 px-4">
            <span className="text-3xl block mb-2 select-none">🌱</span>
            <p className="text-sm font-bold text-gray-500">軌跡未開始</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              喺下面中央撳「＋」揀「成長點滴」記低第一件事，呢度就會亮起。
            </p>
          </div>
        ) : (
          <>
            {/* 分類篩選 */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2">
              <button
                onClick={() => setCatFilter(null)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border flex-shrink-0 transition-colors ${
                  catFilter === null
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-purple-200'
                }`}
              >
                全部 {momentsWithCategory.length}
              </button>
              {MOMENT_CATEGORIES.filter(c => categoryCounts.has(c.key)).map(c => (
                <button
                  key={c.key}
                  onClick={() => setCatFilter(catFilter === c.key ? null : c.key)}
                  title={c.hint}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border flex items-center gap-1 flex-shrink-0 transition-colors ${
                    catFilter === c.key ? `${c.chip} ring-2 ring-offset-1 ring-gray-300` : `${c.chip} opacity-70 hover:opacity-100`
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.short}</span>
                  <span className="opacity-60">{categoryCounts.get(c.key)}</span>
                </button>
              ))}
            </div>

            {/* 月份快捷列 */}
            <div ref={monthStripRef} className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 py-1 border-y border-gray-50">
              {monthList.map((m, i) => {
                const count = monthCounts.get(`${m.year}-${m.month}`) || 0;
                const on = i === monthIdx;
                return (
                  <button
                    key={`${m.year}-${m.month}`}
                    data-month={i}
                    onClick={() => { setMonthIdx(i); setPeekDate(null); }}
                    className={`flex-shrink-0 px-2 py-1 rounded-lg text-center transition-colors ${
                      on ? 'bg-purple-600 text-white' : count ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-[10px] font-black tabular-nums leading-tight">{m.month}月</span>
                    <span className={`block text-[8px] tabular-nums leading-tight ${on ? 'text-purple-200' : 'text-gray-400'}`}>
                      {count || '·'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 月曆標題 */}
            <div className="flex items-center justify-between gap-2 mt-3 mb-2">
              <button
                onClick={() => { setMonthIdx(Math.max(0, monthIdx - 1)); setPeekDate(null); }}
                disabled={monthIdx <= 0}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-25 transition-colors"
                aria-label="上個月"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <div className="text-center">
                <p className="text-sm font-black text-gray-800 tabular-nums">
                  {shownMonth?.year} 年 {shownMonth?.month} 月
                </p>
                <p className="text-[9px] text-gray-400">
                  {monthCounts.get(`${shownMonth?.year}-${shownMonth?.month}`) || 0} 篇記錄
                </p>
              </div>
              <button
                onClick={() => { setMonthIdx(Math.min(monthList.length - 1, monthIdx + 1)); setPeekDate(null); }}
                disabled={monthIdx >= monthList.length - 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-25 transition-colors"
                aria-label="下個月"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* 星期標頭 */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_CN.map(w => (
                <span key={w} className="text-[9px] text-gray-300 font-bold text-center">{w}</span>
              ))}
            </div>

            {/* 月曆格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, i) => {
                if (!cell) return <span key={`e${i}`} className="aspect-square" />;
                const items = momentsByDate.get(cell.key) || [];
                const outOfRange = cell.key < birthStr || cell.key > todayStr;
                const isToday = cell.key === todayStr;
                const isPeeked = cell.key === peekDate;

                if (items.length === 0) {
                  return (
                    <span
                      key={cell.key}
                      className={`aspect-square rounded-xl flex items-start justify-center pt-1 text-[9px] tabular-nums ${
                        outOfRange ? 'text-gray-200' : isToday ? 'bg-purple-50 ring-1 ring-purple-200 text-purple-400 font-bold' : 'bg-slate-50 text-gray-300'
                      }`}
                    >{cell.day}</span>
                  );
                }

                const cat = CATEGORY_MAP[items[0].category];
                const { emoji } = momentDisplay(items[0].log);
                return (
                  <button
                    key={cell.key}
                    onMouseEnter={() => setPeekDate(cell.key)}
                    onFocus={() => setPeekDate(cell.key)}
                    onClick={() => setPeekDate(cell.key)}
                    title={`${cell.day} 日 · ${items.length > 1 ? `${items.length} 件事` : momentDisplay(items[0].log).title}`}
                    className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all hover:scale-105 focus:outline-none ${cat.ring} ${
                      isPeeked ? 'ring-2 ring-offset-1 ring-gray-800 scale-105' : ''
                    }`}
                  >
                    <span className="absolute top-0.5 left-1 text-[8px] text-gray-400 tabular-nums font-bold">{cell.day}</span>
                    <span className="text-lg leading-none select-none mt-1">{emoji}</span>
                    <span className={`absolute bottom-1 w-4 h-1 rounded-full ${cat.dot}`} />
                    {items.length > 1 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[13px] h-[13px] px-0.5 rounded-full bg-gray-800 text-white text-[8px] font-black flex items-center justify-center tabular-nums">
                        {items.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 預覽 */}
            <div className="mt-3 min-h-[92px] bg-slate-50/70 border border-gray-100 rounded-2xl p-3">
              {peekDate && peekMoments.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11.5px] font-black text-gray-700">
                      {new Date(peekDate).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric' })}
                      <span className="text-gray-400 font-bold"> 星期{WEEKDAY_CN[new Date(peekDate).getDay()]}</span>
                    </span>
                    <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded whitespace-nowrap tabular-nums">
                      {ageAt(peekDate).label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {peekMoments.map(({ log, category }) => {
                      const { emoji, title } = momentDisplay(log);
                      const cat = CATEGORY_MAP[category];
                      return (
                        <button
                          key={log.id}
                          onClick={() => openSingle(log.id)}
                          className="w-full flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-2.5 py-2 text-left hover:border-purple-200 active:scale-[0.99] transition-all"
                        >
                          <span className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-base flex-shrink-0 select-none">
                            {emoji}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[12px] font-black text-gray-800 truncate leading-snug">{title}</span>
                            {log.notes && <span className="block text-[9.5px] text-gray-400 truncate leading-tight">{log.notes}</span>}
                          </span>
                          <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border flex-shrink-0 ${cat.chip}`}>
                            {cat.short}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-5">
                  <p className="text-[11px] text-gray-400 font-bold">掂一下有 emoji 嘅日子</p>
                  <p className="text-[9.5px] text-gray-300 mt-0.5">就會喺呢度預覽，撳入去睇全文</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 點滴札記 ─────────────────────────────────────────────────────── */}
      {hasMoments ? (
        <>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜尋點滴標題或內容⋯"
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-purple-400 focus:bg-white outline-none text-sm text-gray-700 placeholder-gray-300 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-gray-500"
                    aria-label="清除搜尋"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1 flex-shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-300 hover:text-gray-400'}`}
                  aria-label="格狀檢視" title="格狀檢視"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-300 hover:text-gray-400'}`}
                  aria-label="列表檢視" title="列表檢視"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {moodCounts.size > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
                <button
                  onClick={() => setMoodFilter(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors flex-shrink-0 ${
                    moodFilter === null ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-400 border-gray-100 hover:border-purple-200'
                  }`}
                >
                  全部 {momentLogs.length}
                </button>
                {MOOD_OPTIONS.filter(m => moodCounts.has(m.emoji)).map(m => (
                  <button
                    key={m.emoji}
                    onClick={() => setMoodFilter(moodFilter === m.emoji ? null : m.emoji)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors flex items-center gap-1 flex-shrink-0 ${
                      moodFilter === m.emoji ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'
                    }`}
                  >
                    <span>{m.emoji}</span><span>{m.label}</span>
                    <span className={moodFilter === m.emoji ? 'text-purple-200' : 'text-gray-300'}>{moodCounts.get(m.emoji)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredMoments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm text-center py-12 px-6">
              <span className="text-4xl block mb-3 select-none">🔍</span>
              <h4 className="font-extrabold text-gray-600 mb-1 text-sm">搵唔到符合嘅點滴</h4>
              <p className="text-xs text-gray-400">試下換個關鍵字，或者清除篩選。</p>
              <button
                onClick={() => { setSearch(''); setMoodFilter(null); }}
                className="mt-4 px-4 py-2 bg-purple-50 text-purple-600 text-xs font-bold rounded-xl hover:bg-purple-100 transition-colors"
              >清除全部篩選</button>
            </div>
          ) : (
            <div className="space-y-5">
              {hasFilter && (
                <p className="text-xs text-gray-400 px-1">
                  篩選出 <span className="font-bold text-purple-600">{filteredMoments.length}</span> 篇點滴
                </p>
              )}

              {groupedMoments.map(([month, items]) => (
                <div key={month}>
                  <div className="sticky top-0 z-[5] flex items-center gap-3 py-2 bg-[#f0f9ff]">
                    <h4 className="text-xs font-black text-purple-800 px-3 py-1 bg-purple-50 rounded-full border border-purple-100 whitespace-nowrap">
                      {monthLabel(month)}
                    </h4>
                    <div className="h-px flex-1 bg-purple-100" />
                    <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">{items.length} 篇</span>
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                      {items.map(log => {
                        const { emoji, title } = momentDisplay(log);
                        return (
                          <button
                            key={log.id}
                            onClick={() => openMoment(log.id)}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-left hover:border-purple-200 hover:shadow-md active:scale-[0.97] transition-all flex flex-col gap-2 group"
                          >
                            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-2xl select-none group-hover:scale-105 transition-transform ${CATEGORY_MAP[inferCategory(log)].chip}`}>
                              {emoji}
                            </div>
                            <p className="font-black text-purple-950 text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.2em]">{title}</p>
                            {log.notes && <p className="text-[10px] text-gray-400 line-clamp-1 leading-tight">{log.notes}</p>}
                            <div className="flex items-center justify-between gap-1 mt-auto pt-1.5 border-t border-gray-50">
                              <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap tabular-nums">
                                {ageAt(log.timestamp).label}
                              </span>
                              <span className="text-[9px] text-gray-300 font-medium whitespace-nowrap tabular-nums">{fmtShort(log.timestamp)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="relative border-l border-purple-100 pl-4 sm:pl-6 ml-3 space-y-3 mt-3">
                      {items.map(log => {
                        const { emoji, title } = momentDisplay(log);
                        return (
                          <button key={log.id} onClick={() => openMoment(log.id)} className="relative block w-full text-left group">
                            <div className={`absolute -left-[30px] sm:-left-[38px] top-3 w-[30px] h-[30px] rounded-full border-4 border-[#f0f9ff] flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform select-none ${CATEGORY_MAP[inferCategory(log)].chip}`}>
                              {emoji}
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:border-purple-200 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-black text-purple-950 text-sm leading-snug">{title}</h5>
                                <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 tabular-nums">
                                  {ageAt(log.timestamp).label}
                                </span>
                              </div>
                              {log.notes && <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 leading-relaxed">{log.notes}</p>}
                              <div className="flex items-center gap-1.5 text-[9px] text-gray-300 mt-1.5 font-medium tabular-nums">
                                <Calendar className="w-3 h-3" />
                                <span>{fmtShort(log.timestamp)}</span><span>·</span><span>{fmtTime(log.timestamp)}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm text-center py-12 px-6">
          <span className="text-4xl block mb-3 select-none">✍️</span>
          <h4 className="font-extrabold text-gray-600 mb-2">記錄 {BABY_NAME} 的第一個感動</h4>
          <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
            尚未有成長點滴記錄。撳下面中央嘅「＋」，揀「成長點滴」就可以新增特別時刻、生活趣事或者出遊心情。
          </p>
        </div>
      )}

      {/* ── 詳情彈窗 ─────────────────────────────────────────────────────── */}
      {selected && (
        <LogDetailModal
          log={selected}
          onClose={closeModal}
          onUpdate={onUpdateLog}
          onDelete={onDeleteLog}
          {...(momentIndex >= 0 ? {
            position: { index: momentIndex, total: filteredMoments.length },
            onPrev: () => momentIndex > 0 && setSelectedId(filteredMoments[momentIndex - 1].id),
            onNext: () => momentIndex < filteredMoments.length - 1 && setSelectedId(filteredMoments[momentIndex + 1].id),
          } : {})}
        />
      )}

      {/* ── 里程碑對照指引 ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowReference(!showReference)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Flag className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-gray-800 text-sm sm:text-base">里程碑對照指引 (輔助參考)</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">查看嬰幼兒在不同歲段的預期發展指標</p>
            </div>
          </div>
          {showReference ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showReference && (
          <div className="p-4 sm:p-5 border-t border-gray-50 bg-gray-50/30 space-y-5">
            <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
              💡 <strong>小貼士：</strong>本發展指標由美國 CDC 疾病管制局 &amp; 香港衞生署家庭健康服務提供，僅作大方向比對與指導。每個BB的步伐都是獨步天下、因人而異的，如有任何關於發展緩急的疑惑，請向母嬰健康院或兒科醫生進行諮詢。
            </div>

            {Object.entries(milestonesByMonth)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([month, milestones]) => (
                <div key={month}>
                  <div className="flex items-center gap-3 mb-2.5">
                    <h4 className="text-xs font-black text-purple-800 px-3 py-1 bg-purple-50 rounded-full border border-purple-100 whitespace-nowrap">
                      {Number(month) === 0 ? '初生' : `${month} 個月大`}
                    </h4>
                    <div className="h-px flex-1 bg-purple-100" />
                    <span className="text-[10px] text-gray-400 font-bold">{milestones.length} 項</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {milestones.map(m => (
                      <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col gap-1.5 hover:border-purple-200 transition-colors">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border self-start whitespace-nowrap ${categoryStyle(m.category)}`}>
                          {m.category}
                        </span>
                        <p className="text-xs font-semibold leading-relaxed text-gray-700">{m.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
