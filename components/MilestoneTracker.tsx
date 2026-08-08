import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { BabyLog, LogType, MilestoneLog } from '../types';
import { MILESTONES } from '../constants';
import { BABY_NAME, getBirthDate } from '../services/config';
import {
  Flag, Sparkles, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Calendar, Heart, Search, X, LayoutGrid, List, Pencil, Trash2, Check,
} from 'lucide-react';

interface MilestoneTrackerProps {
  logs: BabyLog[];
  onDeleteLog: (id: string) => void;
  onUpdateLog: (log: BabyLog) => void;
}

// 同 LogForm 嘅心情選項一致，畀編輯彈窗重用
const MOOD_OPTIONS = [
  { emoji: '😊', label: '開心' },
  { emoji: '🥰', label: '撒嬌' },
  { emoji: '😮', label: '好奇' },
  { emoji: '😢', label: '扭計' },
  { emoji: '😴', label: '累了' },
  { emoji: '🤪', label: '搞怪' },
  { emoji: '❤️', label: '得意' },
];

// 發展範疇配色，卡片同對照表共用
const categoryStyle = (category: string) => {
  if (category.includes('大肌肉')) return 'bg-blue-50 text-blue-600 border-blue-100';
  if (category.includes('細肌肉')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (category.includes('語言')) return 'bg-amber-50 text-amber-600 border-amber-100';
  if (category.includes('社交')) return 'bg-rose-50 text-rose-600 border-rose-100';
  return 'bg-purple-50 text-purple-600 border-purple-100';
};

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ logs, onDeleteLog, onUpdateLog }) => {
  const [showReference, setShowReference] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftEmoji, setDraftEmoji] = useState('');
  const [draftNotes, setDraftNotes] = useState('');

  // ── 資料：只取成長點滴，最新排先 ──────────────────────────────────────────
  const momentLogs = useMemo(() => {
    return logs
      .filter((l): l is MilestoneLog => l.type === LogType.MILESTONE)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs]);

  // 顯示用嘅標題／emoji（舊記錄可能只有 milestoneId）
  const displayOf = useCallback((log: MilestoneLog) => {
    if (log.title || log.emoji) {
      return { emoji: log.emoji || '✨', title: log.title || '特別瞬間' };
    }
    if (log.milestoneId) {
      const matched = MILESTONES.find(x => x.id === log.milestoneId);
      return { emoji: '🏆', title: matched ? `[${matched.category}] ${matched.name}` : '里程碑紀錄' };
    }
    return { emoji: '✨', title: '特別瞬間' };
  }, []);

  // 出生後年齡（月／日），同 App 嘅計法一致
  const ageAt = useCallback((dateStr: string) => {
    try {
      const diffTime = new Date(dateStr).getTime() - getBirthDate().getTime();
      if (diffTime < 0) return { months: -1, days: 0, label: '出生前' };
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30.4375);
      const days = Math.floor(diffDays % 30.4375);
      return { months, days, label: months === 0 ? `${days}天` : `${months}個月${days > 0 ? ` ${days}天` : ''}` };
    } catch {
      return { months: 0, days: 0, label: '' };
    }
  }, []);

  const fmtDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    } catch { return ''; }
  };
  const fmtShortDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' });
    } catch { return ''; }
  };
  const fmtTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  // ── 搜尋 + 心情篩選 ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return momentLogs.filter(log => {
      if (moodFilter && (log.emoji || '') !== moodFilter) return false;
      if (!q) return true;
      const { title } = displayOf(log);
      return `${title} ${log.notes || ''}`.toLowerCase().includes(q);
    });
  }, [momentLogs, search, moodFilter, displayOf]);

  // 按「當時月齡」分組，每組由新到舊
  const grouped = useMemo(() => {
    const map = new Map<number, MilestoneLog[]>();
    filtered.forEach(log => {
      const m = ageAt(log.timestamp).months;
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(log);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered, ageAt]);

  // 心情分佈（只計實際用過嘅）
  const moodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    momentLogs.forEach(l => {
      if (l.emoji) counts.set(l.emoji, (counts.get(l.emoji) || 0) + 1);
    });
    return counts;
  }, [momentLogs]);

  const spanMonths = useMemo(() => {
    if (momentLogs.length === 0) return 0;
    const monthsList = momentLogs.map(l => ageAt(l.timestamp).months);
    return Math.max(...monthsList) - Math.min(...monthsList) + 1;
  }, [momentLogs, ageAt]);

  const daysSinceLatest = useMemo(() => {
    if (momentLogs.length === 0) return null;
    const diff = Date.now() - new Date(momentLogs[0].timestamp).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [momentLogs]);

  // ── 詳情彈窗：用 id 定位，避免刪除／編輯後索引錯位 ────────────────────────
  const selectedIndex = selectedId ? filtered.findIndex(l => l.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;

  const closeModal = useCallback(() => {
    setSelectedId(null);
    setIsEditing(false);
  }, []);

  const goRelative = useCallback((delta: number) => {
    if (selectedIndex < 0) return;
    const next = selectedIndex + delta;
    if (next < 0 || next >= filtered.length) return;
    setSelectedId(filtered[next].id);
    setIsEditing(false);
  }, [selectedIndex, filtered]);

  // 選中嘅記錄如果被篩走／刪走，就關閉彈窗
  useEffect(() => {
    if (selectedId && selectedIndex < 0) closeModal();
  }, [selectedId, selectedIndex, closeModal]);

  // 鍵盤：Esc 關閉、左右鍵揭前後篇（編輯緊唔攔截）
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeModal(); return; }
      if (isEditing) return;
      if (e.key === 'ArrowLeft') goRelative(-1);
      if (e.key === 'ArrowRight') goRelative(1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected, isEditing, closeModal, goRelative]);

  const startEdit = () => {
    if (!selected) return;
    const { emoji, title } = displayOf(selected);
    setDraftTitle(selected.title || title);
    setDraftEmoji(selected.emoji || emoji);
    setDraftNotes(selected.notes || '');
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!selected) return;
    const title = draftTitle.trim();
    if (!title) return;
    onUpdateLog({ ...selected, title, emoji: draftEmoji, notes: draftNotes.trim() || undefined });
    setIsEditing(false);
  };

  const removeSelected = () => {
    if (!selected) return;
    if (!window.confirm('確定要刪除這條成長點滴嗎？')) return;
    onDeleteLog(selected.id);
    closeModal();
  };

  const monthLabel = (m: number) => (m <= 0 ? '未滿 1 個月' : `第 ${m} 個月大`);

  const hasRecords = momentLogs.length > 0;
  const hasFilter = !!(search.trim() || moodFilter);

  // 參考里程碑按月份分組
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
              成長點滴札記
            </h3>
            <p className="text-[11px] sm:text-xs text-purple-200 mt-1 leading-relaxed">
              {BABY_NAME} 成長路上的特別時刻、趣事同生活點滴。
            </p>
          </div>
          <Heart className="w-6 h-6 text-purple-200 fill-current flex-shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-white/15 rounded-2xl px-2 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black leading-none">{momentLogs.length}</p>
            <p className="text-[10px] text-purple-200 mt-1.5">篇記錄</p>
          </div>
          <div className="bg-white/15 rounded-2xl px-2 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black leading-none">{spanMonths}</p>
            <p className="text-[10px] text-purple-200 mt-1.5">個月跨度</p>
          </div>
          <div className="bg-white/15 rounded-2xl px-2 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black leading-none">
              {daysSinceLatest === null ? '—' : daysSinceLatest === 0 ? '今日' : daysSinceLatest}
            </p>
            <p className="text-[10px] text-purple-200 mt-1.5">
              {daysSinceLatest === null || daysSinceLatest === 0 ? '最近記錄' : '日前記錄'}
            </p>
          </div>
        </div>
      </div>

      {hasRecords && (
        <>
          {/* ── 搜尋 / 心情篩選 / 檢視切換 ──────────────────────────────── */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜尋標題或內容⋯"
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

              {/* 檢視模式 */}
              <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1 flex-shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-300 hover:text-gray-400'}`}
                  aria-label="格狀檢視"
                  title="格狀檢視"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-300 hover:text-gray-400'}`}
                  aria-label="時間軸檢視"
                  title="時間軸檢視"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 心情 chips（只顯示用過嘅） */}
            {moodCounts.size > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
                <button
                  onClick={() => setMoodFilter(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors flex-shrink-0 ${
                    moodFilter === null
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-400 border-gray-100 hover:border-purple-200'
                  }`}
                >
                  全部 {momentLogs.length}
                </button>
                {MOOD_OPTIONS.filter(m => moodCounts.has(m.emoji)).map(m => (
                  <button
                    key={m.emoji}
                    onClick={() => setMoodFilter(moodFilter === m.emoji ? null : m.emoji)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors flex items-center gap-1 flex-shrink-0 ${
                      moodFilter === m.emoji
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                    <span className={moodFilter === m.emoji ? 'text-purple-200' : 'text-gray-300'}>
                      {moodCounts.get(m.emoji)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 記錄列表 ────────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm text-center py-12 px-6">
              <span className="text-4xl block mb-3 select-none">🔍</span>
              <h4 className="font-extrabold text-gray-600 mb-1 text-sm">搵唔到符合嘅記錄</h4>
              <p className="text-xs text-gray-400">試下換個關鍵字，或者清除篩選。</p>
              <button
                onClick={() => { setSearch(''); setMoodFilter(null); }}
                className="mt-4 px-4 py-2 bg-purple-50 text-purple-600 text-xs font-bold rounded-xl hover:bg-purple-100 transition-colors"
              >
                清除全部篩選
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {hasFilter && (
                <p className="text-xs text-gray-400 px-1">
                  篩選出 <span className="font-bold text-purple-600">{filtered.length}</span> 篇記錄
                </p>
              )}

              {grouped.map(([month, items]) => (
                <div key={month}>
                  {/* 月齡分組標題（捲動時黐頂） */}
                  <div className="sticky top-0 z-[5] flex items-center gap-3 py-2 bg-[#f0f9ff]">
                    <h4 className="text-xs font-black text-purple-800 px-3 py-1 bg-purple-50 rounded-full border border-purple-100 whitespace-nowrap">
                      {monthLabel(month)}
                    </h4>
                    <div className="h-px flex-1 bg-purple-100" />
                    <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">{items.length} 篇</span>
                  </div>

                  {viewMode === 'grid' ? (
                    /* 格狀：一屏睇到十幾篇，詳情收埋喺彈窗 */
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                      {items.map(log => {
                        const { emoji, title } = displayOf(log);
                        return (
                          <button
                            key={log.id}
                            onClick={() => setSelectedId(log.id)}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-left hover:border-purple-200 hover:shadow-md active:scale-[0.97] transition-all flex flex-col gap-2 group"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100/60 flex items-center justify-center text-2xl select-none group-hover:scale-105 transition-transform">
                              {emoji}
                            </div>
                            <p className="font-black text-purple-950 text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.2em]">
                              {title}
                            </p>
                            {log.notes && (
                              <p className="text-[10px] text-gray-400 line-clamp-1 leading-tight">{log.notes}</p>
                            )}
                            <div className="flex items-center justify-between gap-1 mt-auto pt-1.5 border-t border-gray-50">
                              <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                                {ageAt(log.timestamp).label}
                              </span>
                              <span className="text-[9px] text-gray-300 font-medium whitespace-nowrap">
                                {fmtShortDate(log.timestamp)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* 時間軸：保留時序感，但內文摺埋一行 */
                    <div className="relative border-l border-purple-100 pl-4 sm:pl-6 ml-3 space-y-3 mt-3">
                      {items.map(log => {
                        const { emoji, title } = displayOf(log);
                        return (
                          <button
                            key={log.id}
                            onClick={() => setSelectedId(log.id)}
                            className="relative block w-full text-left group"
                          >
                            <div className="absolute -left-[30px] sm:-left-[38px] top-3 w-[30px] h-[30px] rounded-full bg-purple-50 border-4 border-[#f0f9ff] flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform select-none">
                              {emoji}
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:border-purple-200 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-black text-purple-950 text-sm leading-snug">{title}</h5>
                                <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                                  {ageAt(log.timestamp).label}
                                </span>
                              </div>
                              {log.notes && (
                                <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 leading-relaxed">{log.notes}</p>
                              )}
                              <div className="flex items-center gap-1.5 text-[9px] text-gray-300 mt-1.5 font-medium">
                                <Calendar className="w-3 h-3" />
                                <span>{fmtShortDate(log.timestamp)}</span>
                                <span>·</span>
                                <span>{fmtTime(log.timestamp)}</span>
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
      )}

      {!hasRecords && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm text-center py-12 px-6">
          <span className="text-4xl block mb-3 select-none">✍️</span>
          <h4 className="font-extrabold text-gray-600 mb-2">記錄 {BABY_NAME} 的第一個感動</h4>
          <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
            尚未有成長點滴記錄。撳下面中央嘅「＋」，揀「成長點滴」就可以新增特別時刻、生活趣事或者出遊心情。
          </p>
        </div>
      )}

      {/* ── 詳情彈窗 ─────────────────────────────────────────────────────── */}
      {selected && (() => {
        const { emoji, title } = displayOf(selected);
        const age = ageAt(selected.timestamp);
        return (
          <div
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={closeModal}
          >
            <div
              className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col animate-slide-up overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* 頭部 */}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-5 text-white relative flex-shrink-0">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="關閉"
                >
                  <X className="w-4 h-4" />
                </button>

                {isEditing ? (
                  <div className="pr-10">
                    <label className="text-[10px] text-purple-200 font-bold block mb-1.5">心情與狀態</label>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {MOOD_OPTIONS.map(m => (
                        <button
                          key={m.emoji}
                          onClick={() => setDraftEmoji(m.emoji)}
                          className={`px-2.5 py-1.5 rounded-xl flex flex-col items-center gap-0.5 border-2 transition-all flex-shrink-0 ${
                            draftEmoji === m.emoji ? 'border-white bg-white/25' : 'border-transparent bg-white/10'
                          }`}
                        >
                          <span className="text-lg">{m.emoji}</span>
                          <span className="text-[9px]">{m.label}</span>
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={e => setDraftTitle(e.target.value)}
                      placeholder="事件 / 時刻標題"
                      className="w-full mt-3 px-3 py-2 rounded-xl bg-white/20 border border-white/30 outline-none focus:bg-white/30 text-white font-bold placeholder-purple-200 text-sm"
                    />
                  </div>
                ) : (
                  <div className="pr-10">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mb-3 select-none">
                      {emoji}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black leading-snug">{title}</h3>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg">
                        當時 {BABY_NAME} {age.label}
                      </span>
                      <span className="text-[10px] text-purple-200 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(selected.timestamp)} {fmtTime(selected.timestamp)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 內文 */}
              <div className="p-5 overflow-y-auto flex-1">
                {isEditing ? (
                  <>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">成長細節記述</label>
                    <textarea
                      rows={6}
                      value={draftNotes}
                      onChange={e => setDraftNotes(e.target.value)}
                      placeholder={`當時 ${BABY_NAME} 發生咗啲咩呢？`}
                      className="w-full p-3 rounded-xl bg-purple-50/40 border border-purple-100 focus:ring-2 focus:ring-purple-400 outline-none text-sm text-purple-950 placeholder-purple-300 leading-relaxed resize-none"
                    />
                  </>
                ) : selected.notes ? (
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selected.notes}</p>
                ) : (
                  <p className="text-gray-300 text-sm italic text-center py-6">呢篇未有細節描述</p>
                )}
              </div>

              {/* 底部操作 */}
              <div className="border-t border-gray-100 p-3 flex items-center gap-2 flex-shrink-0 bg-gray-50/50">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2.5 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-100 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!draftTitle.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center gap-1.5 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      儲存
                    </button>
                  </>
                ) : (
                  <>
                    {/* 前後篇導航 */}
                    <button
                      onClick={() => goRelative(-1)}
                      disabled={selectedIndex <= 0}
                      className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                      aria-label="上一篇（較新）"
                      title="上一篇（較新）"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                      {selectedIndex + 1} / {filtered.length}
                    </span>
                    <button
                      onClick={() => goRelative(1)}
                      disabled={selectedIndex >= filtered.length - 1}
                      className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                      aria-label="下一篇（較舊）"
                      title="下一篇（較舊）"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    <button
                      onClick={startEdit}
                      className="px-3 py-2.5 rounded-xl text-blue-500 hover:bg-blue-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      編輯
                    </button>
                    <button
                      onClick={removeSelected}
                      className="px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      刪除
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 里程碑對照指引（卡片式） ────────────────────────────────────── */}
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
                      <div
                        key={m.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col gap-1.5 hover:border-purple-200 transition-colors"
                      >
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
