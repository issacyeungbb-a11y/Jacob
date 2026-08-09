import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { BabyLog, LogType, MilestoneLog } from '../types';
import { MILESTONES } from '../constants';
import { BABY_NAME, getBirthDate } from '../services/config';
import {
  LifeEvent, LifeTone, TONE_ORDER, TONE_STYLE,
  deriveLifeEvents, momentDisplay, ageAt, localDateStr,
} from '../services/lifeEvents';
import { LogDetailModal } from './LogDetailModal';
import {
  Flag, Sparkles, ChevronDown, ChevronUp, Calendar, Heart,
  Search, X, LayoutGrid, List, Hand,
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

const categoryStyle = (category: string) => {
  if (category.includes('大肌肉')) return 'bg-blue-50 text-blue-600 border-blue-100';
  if (category.includes('細肌肉')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (category.includes('語言')) return 'bg-amber-50 text-amber-600 border-amber-100';
  if (category.includes('社交')) return 'bg-rose-50 text-rose-600 border-rose-100';
  return 'bg-purple-50 text-purple-600 border-purple-100';
};

const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ logs, onDeleteLog, onUpdateLog }) => {
  const [showReference, setShowReference] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [peekDate, setPeekDate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navInMoments, setNavInMoments] = useState(false);

  // ── 成長軌跡事件（點滴＋疫苗＋身體數據＋自動偵測嘅第一次）─────────────────
  const lifeEvents = useMemo(() => deriveLifeEvents(logs), [logs]);

  /** 日期 → 當日事件 */
  const eventsByDate = useMemo(() => {
    const map = new Map<string, LifeEvent[]>();
    lifeEvents.forEach(ev => {
      const key = localDateStr(new Date(ev.ts));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    // 同一日按時間先後排
    map.forEach(list => list.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()));
    return map;
  }, [lifeEvents]);

  /** 由出世個月到今個月，逐個月一行 */
  const monthRows = useMemo(() => {
    const birth = getBirthDate();
    const now = new Date();
    const rows: { year: number; month: number; days: number }[] = [];
    const cur = new Date(birth.getFullYear(), birth.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 1);
    // 上限 240 個月，防止 BIRTH_DATE 設錯時無限迴圈
    for (let guard = 0; cur <= last && guard < 240; guard++) {
      rows.push({
        year: cur.getFullYear(),
        month: cur.getMonth() + 1,
        days: new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return rows;
  }, []);

  const todayStr = localDateStr(new Date());
  const birthStr = localDateStr(getBirthDate());

  /** 一格入面最搶眼嘅分類，決定格仔顏色 */
  const dominantTone = (evts: LifeEvent[]): LifeTone =>
    TONE_ORDER.find(t => evts.some(e => e.tone === t)) || 'moment';

  const peekEvents = peekDate ? eventsByDate.get(peekDate) || [] : [];

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

  const daysSinceLatest = useMemo(() => {
    if (lifeEvents.length === 0) return null;
    const diff = Date.now() - new Date(lifeEvents[0].ts).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [lifeEvents]);

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
            <p className="text-2xl font-black leading-none tabular-nums">{lifeEvents.length}</p>
            <p className="text-[10px] text-purple-200 mt-1.5">件大事</p>
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

      {/* ── 成長軌跡：月 × 日 網格 ──────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              成長軌跡
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">邊個月、邊一日發生過事，就會着色</p>
          </div>
          <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full font-bold whitespace-nowrap tabular-nums">
            {eventsByDate.size} 日有記錄
          </span>
        </div>

        {lifeEvents.length === 0 ? (
          <div className="text-center py-10 px-4">
            <span className="text-3xl block mb-2 select-none">🌱</span>
            <p className="text-sm font-bold text-gray-500">軌跡未開始</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              記低成長點滴、打針或者磅重之後，呢度就會逐格亮起。
            </p>
          </div>
        ) : (
          <>
            {/* 日子刻度 */}
            <div className="grid gap-[2px] mb-1 pl-[34px]" style={{ gridTemplateColumns: 'repeat(31, minmax(0,1fr))' }}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <span
                  key={d}
                  className="text-[7px] text-gray-300 text-center tabular-nums leading-none"
                >
                  {d === 1 || d === 10 || d === 20 || d === 31 ? d : ''}
                </span>
              ))}
            </div>

            {/* 月份行 */}
            <div className="space-y-[2px]">
              {monthRows.map(({ year, month, days }) => (
                <div key={`${year}-${month}`} className="flex items-center gap-1">
                  <div className="w-[30px] flex-shrink-0 text-right leading-none">
                    {month === 1 || monthRows[0].year === year && monthRows[0].month === month ? (
                      <span className="block text-[6.5px] text-gray-300 tabular-nums">{year}</span>
                    ) : null}
                    <span className="block text-[8.5px] text-gray-500 font-bold tabular-nums">{month}月</span>
                  </div>

                  <div
                    className="grid gap-[2px] flex-1"
                    style={{ gridTemplateColumns: 'repeat(31, minmax(0,1fr))' }}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                      if (day > days) return <span key={day} className="aspect-square" />;

                      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const evts = eventsByDate.get(key);
                      const outOfRange = key < birthStr || key > todayStr;
                      const isToday = key === todayStr;
                      const isPeeked = key === peekDate;

                      if (!evts) {
                        return (
                          <span
                            key={day}
                            className={`aspect-square rounded-[2px] ${
                              outOfRange ? 'bg-transparent' : isToday ? 'bg-purple-100 ring-1 ring-purple-300' : 'bg-slate-100'
                            }`}
                          />
                        );
                      }

                      const tone = dominantTone(evts);
                      const label = `${month}月${day}日 · ${evts.length > 1 ? `${evts.length} 件事` : evts[0].title}`;
                      return (
                        <button
                          key={day}
                          onMouseEnter={() => setPeekDate(key)}
                          onFocus={() => setPeekDate(key)}
                          onClick={() => setPeekDate(key)}
                          title={label}
                          aria-label={label}
                          style={{ touchAction: 'manipulation' }}
                          className={`aspect-square rounded-[2px] transition-transform hover:scale-[1.6] focus:scale-[1.6] focus:outline-none ${TONE_STYLE[tone].cell} ${
                            isPeeked ? 'ring-2 ring-offset-1 ring-gray-800 scale-[1.6]' : ''
                          } ${evts.length > 1 ? 'ring-1 ring-inset ring-white/70' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 圖例 */}
            <div className="flex flex-wrap gap-2.5 mt-3 pt-3 border-t border-gray-50">
              {TONE_ORDER.map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[9px] text-gray-400">
                  <span className={`w-2 h-2 rounded-[2px] ${TONE_STYLE[t].cell}`} />
                  {TONE_STYLE[t].label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-[9px] text-gray-300 ml-auto">
                <Hand className="w-3 h-3" />掂一下睇預覽 · 撳入去睇詳情
              </span>
            </div>

            {/* 預覽 */}
            <div className="mt-3 min-h-[86px] bg-slate-50/70 border border-gray-100 rounded-2xl p-3">
              {peekDate && peekEvents.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-black text-gray-700">
                      {new Date(peekDate).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric' })}
                      <span className="text-gray-400 font-bold"> 星期{WEEKDAY_CN[new Date(peekDate).getDay()]}</span>
                    </span>
                    <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded whitespace-nowrap tabular-nums">
                      {ageAt(peekDate).label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {peekEvents.map(ev => (
                      <button
                        key={ev.key}
                        onClick={() => ev.log && openSingle(ev.log.id)}
                        className="w-full flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-2.5 py-2 text-left hover:border-purple-200 active:scale-[0.99] transition-all"
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] flex-shrink-0 select-none ${TONE_STYLE[ev.tone].bubble}`}>
                          {ev.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[11.5px] font-black text-gray-800 truncate leading-snug">{ev.title}</span>
                          {ev.desc && <span className="block text-[9.5px] text-gray-400 truncate leading-tight">{ev.desc}</span>}
                        </span>
                        <span className="text-[9px] text-gray-300 flex-shrink-0 tabular-nums">{fmtTime(ev.ts)}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-4">
                  <Hand className="w-4 h-4 text-gray-300 mb-1.5" />
                  <p className="text-[11px] text-gray-400 font-bold">掂一下有顏色嘅格仔</p>
                  <p className="text-[9.5px] text-gray-300 mt-0.5">就會喺呢度預覽嗰日發生咩事</p>
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
                            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100/60 flex items-center justify-center text-2xl select-none group-hover:scale-105 transition-transform">
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
                            <div className="absolute -left-[30px] sm:-left-[38px] top-3 w-[30px] h-[30px] rounded-full bg-purple-50 border-4 border-[#f0f9ff] flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform select-none">
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
