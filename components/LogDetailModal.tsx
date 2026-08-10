import React, { useState, useEffect, useCallback } from 'react';
import {
  BabyLog, LogType, FeedType, DiaperType,
  FeedLog, SleepLog, DiaperLog, HealthLog, MilestoneLog, OtherLog, PumpLog, TummyTimeLog,
} from '../types';
import { BABY_NAME } from '../services/config';
import { MOMENT_CATEGORIES, CATEGORY_MAP, inferCategory } from '../services/momentCategories';
import { ageAt, describeLog, hhmm, durationCn } from '../services/lifeEvents';
import { X, Pencil, Trash2, Check, CalendarDays, Moon, ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_LABEL: Record<string, { label: string; dot: string }> = {
  [LogType.FEED]:       { label: '餵奶',     dot: 'bg-amber-500' },
  [LogType.DIAPER]:     { label: '換片',     dot: 'bg-emerald-500' },
  [LogType.SLEEP]:      { label: '睡眠',     dot: 'bg-indigo-500' },
  [LogType.PUMP]:       { label: '泵奶',     dot: 'bg-purple-500' },
  [LogType.MILESTONE]:  { label: '成長點滴', dot: 'bg-rose-500' },
  [LogType.HEALTH]:     { label: '身體數據', dot: 'bg-teal-500' },
  [LogType.VACCINE]:    { label: '疫苗',     dot: 'bg-red-500' },
  [LogType.TUMMY_TIME]: { label: '趴趴時間', dot: 'bg-sky-500' },
  [LogType.OTHER]:      { label: '其他',     dot: 'bg-slate-400' },
  [LogType.SUMMARY]:    { label: '每日總結', dot: 'bg-gray-400' },
};

const MOOD_OPTIONS = [
  { emoji: '😊', label: '開心' }, { emoji: '🥰', label: '撒嬌' },
  { emoji: '😮', label: '好奇' }, { emoji: '😢', label: '扭計' },
  { emoji: '😴', label: '累了' }, { emoji: '🤪', label: '搞怪' },
  { emoji: '❤️', label: '得意' },
];

interface Props {
  log: BabyLog;
  onClose: () => void;
  onUpdate: (log: BabyLog) => void;
  onDelete: (id: string) => void;
  /** 可選：前後篇導航（成長點滴札記用） */
  onPrev?: () => void;
  onNext?: () => void;
  position?: { index: number; total: number };
}

export const LogDetailModal: React.FC<Props> = ({
  log, onClose, onUpdate, onDelete, onPrev, onNext, position,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const meta = TYPE_LABEL[log.type] || TYPE_LABEL[LogType.OTHER];

  // 換咗另一篇就退返出編輯模式，避免將舊 draft 寫落新記錄
  useEffect(() => { setIsEditing(false); }, [log.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (isEditing) return;
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [isEditing, onClose, onPrev, onNext]);

  const startEdit = useCallback(() => {
    const d: Record<string, string> = { notes: log.notes || '' };
    switch (log.type) {
      case LogType.FEED: {
        const f = log as FeedLog;
        d.amountMl = String(f.amountMl ?? '');
        d.solidFoodName = f.solidFoodName || '';
        break;
      }
      case LogType.SLEEP: d.durationMinutes = String((log as SleepLog).durationMinutes ?? ''); break;
      case LogType.TUMMY_TIME: d.durationMinutes = String((log as TummyTimeLog).durationMinutes ?? ''); break;
      case LogType.PUMP: {
        const p = log as PumpLog;
        d.amountMl = String(p.amountMl ?? '');
        d.durationMinutes = String(p.durationMinutes ?? '');
        break;
      }
      case LogType.DIAPER: d.status = (log as DiaperLog).status; break;
      case LogType.HEALTH: {
        const h = log as HealthLog;
        d.weightKg = String(h.weightKg ?? '');
        d.heightCm = String(h.heightCm ?? '');
        d.headCircumferenceCm = String(h.headCircumferenceCm ?? '');
        break;
      }
      case LogType.MILESTONE: {
        const m = log as MilestoneLog;
        d.title = m.title || '';
        d.emoji = m.emoji || '✨';
        d.category = inferCategory(m);   // 舊記錄冇分類，先填返推斷值
        break;
      }
      case LogType.OTHER: d.details = (log as OtherLog).details || ''; break;
    }
    setDraft(d);
    setIsEditing(true);
  }, [log]);

  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const save = () => {
    const updated: any = { ...log, notes: draft.notes?.trim() || undefined };
    switch (log.type) {
      case LogType.FEED:
        if ((log as FeedLog).feedType === FeedType.SOLIDS) {
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
      case LogType.DIAPER: updated.status = draft.status as DiaperType; break;
      case LogType.HEALTH:
        updated.weightKg = num(draft.weightKg);
        updated.heightCm = num(draft.heightCm);
        updated.headCircumferenceCm = num(draft.headCircumferenceCm);
        break;
      case LogType.MILESTONE:
        if (!draft.title?.trim()) return;
        updated.title = draft.title.trim();
        updated.emoji = draft.emoji;
        updated.category = draft.category;
        break;
      case LogType.OTHER: updated.details = draft.details?.trim() || ''; break;
    }
    onUpdate(updated as BabyLog);
    setIsEditing(false);
  };

  const remove = () => {
    if (!window.confirm('確定要刪除這條記錄嗎？')) return;
    onDelete(log.id);
    onClose();
  };

  const numField = (key: string, label: string, opts: { suffix?: string; step?: string } = {}) => (
    <div key={key}>
      <label className="block text-[11px] font-bold text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={opts.step || '1'}
          value={draft[key] ?? ''}
          onChange={e => setDraft({ ...draft, [key]: e.target.value })}
          className="flex-1 min-w-0 p-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none text-sm font-bold text-gray-800"
        />
        {opts.suffix && <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">{opts.suffix}</span>}
      </div>
    </div>
  );

  const textField = (key: string, label: string) => (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={draft[key] ?? ''}
        onChange={e => setDraft({ ...draft, [key]: e.target.value })}
        className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none text-sm font-bold text-gray-800"
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col animate-slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 頭部 */}
        <div className="p-5 border-b border-gray-100 flex-shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="關閉"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="flex items-center gap-2 pr-10">
            <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
            <span className="text-[11px] font-black text-gray-400">{meta.label}</span>
          </div>

          {isEditing && log.type === LogType.MILESTONE ? (
            <div className="mt-2.5 space-y-2.5">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m.emoji}
                    onClick={() => setDraft({ ...draft, emoji: m.emoji })}
                    className={`px-2.5 py-1.5 rounded-xl flex flex-col items-center gap-0.5 border-2 flex-shrink-0 transition-all ${
                      draft.emoji === m.emoji ? 'border-purple-500 bg-purple-50' : 'border-transparent bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{m.emoji}</span>
                    <span className="text-[9px] text-gray-500">{m.label}</span>
                  </button>
                ))}
              </div>
              {textField('title', '標題')}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5">分類</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MOMENT_CATEGORIES.filter(c => c.key !== '其他' || draft.category === '其他').map(c => (
                    <button
                      key={c.key}
                      onClick={() => setDraft({ ...draft, category: c.key })}
                      title={c.hint}
                      className={`py-1.5 px-1 rounded-xl flex flex-col items-center gap-0.5 border-2 transition-all ${
                        draft.category === c.key ? `${c.ring} font-black` : 'border-transparent bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span className="text-base leading-none">{c.icon}</span>
                      <span className="text-[9px] tracking-tight">{c.short}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <h3 className="text-lg font-black text-gray-800 mt-1.5 leading-snug pr-10">{describeLog(log)}</h3>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-2 text-[10px] text-gray-400">
            {log.type === LogType.MILESTONE && (() => {
              const c = CATEGORY_MAP[inferCategory(log as MilestoneLog)];
              return (
                <span className={`font-extrabold px-2 py-0.5 rounded border ${c.chip}`}>
                  {c.icon} {c.short}
                </span>
              );
            })()}
            <span className="font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              當時 {BABY_NAME} {ageAt(log.timestamp).label}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {new Date(log.timestamp).toLocaleDateString('zh-HK', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
              })}
              {' '}
              {new Date(log.timestamp).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {log.type === LogType.SLEEP && (() => {
            const s = log as SleepLog;
            const end = new Date(s.timestamp).getTime();
            const start = end - (s.durationMinutes || 0) * 60000;
            return (
              <p className="text-[10px] text-indigo-500 font-bold mt-1.5 flex items-center gap-1">
                <Moon className="w-3 h-3" />
                {hhmm(start)} 瞓著 → {hhmm(end)} 起身（{durationCn(s.durationMinutes || 0)}）
              </p>
            );
          })()}
        </div>

        {/* 內文 */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {isEditing ? (
            <>
              {log.type === LogType.FEED && (
                (log as FeedLog).feedType === FeedType.SOLIDS
                  ? textField('solidFoodName', '副食品名稱')
                  : numField('amountMl', '奶量', { suffix: 'ml' })
              )}
              {log.type === LogType.SLEEP && numField('durationMinutes', '睡眠時長', { suffix: '分鐘' })}
              {log.type === LogType.TUMMY_TIME && numField('durationMinutes', '趴趴時長', { suffix: '分鐘' })}
              {log.type === LogType.PUMP && (
                <div className="grid grid-cols-2 gap-2">
                  {numField('amountMl', '泵咗幾多', { suffix: 'ml' })}
                  {numField('durationMinutes', '用咗幾耐', { suffix: '分鐘' })}
                </div>
              )}
              {log.type === LogType.HEALTH && (
                <div className="grid grid-cols-3 gap-2">
                  {numField('weightKg', '體重', { suffix: 'kg', step: '0.01' })}
                  {numField('heightCm', '身高', { suffix: 'cm', step: '0.1' })}
                  {numField('headCircumferenceCm', '頭圍', { suffix: 'cm', step: '0.1' })}
                </div>
              )}
              {log.type === LogType.DIAPER && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1.5">狀態</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.values(DiaperType).map(s => (
                      <button
                        key={s}
                        onClick={() => setDraft({ ...draft, status: s })}
                        className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${
                          draft.status === s
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-transparent bg-gray-50 text-gray-400'
                        }`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {log.type === LogType.OTHER && textField('details', '內容')}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">
                  {log.type === LogType.MILESTONE ? '成長細節記述' : '備註'}
                </label>
                <textarea
                  rows={log.type === LogType.MILESTONE ? 5 : 3}
                  value={draft.notes ?? ''}
                  onChange={e => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="想補充啲咩？"
                  className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none text-sm text-gray-700 leading-relaxed resize-none placeholder-gray-300"
                />
              </div>
            </>
          ) : log.notes ? (
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{log.notes}</p>
          ) : (
            <p className="text-gray-300 text-sm italic text-center py-4">冇額外備註</p>
          )}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-gray-100 p-3 flex items-center gap-2 flex-shrink-0 bg-gray-50/50">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-100 transition-colors"
              >取消</button>
              <button
                onClick={save}
                disabled={log.type === LogType.MILESTONE && !draft.title?.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center gap-1.5 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4" />儲存
              </button>
            </>
          ) : (
            <>
              {position ? (
                <>
                  <button
                    onClick={onPrev}
                    disabled={position.index <= 0}
                    className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                    aria-label="上一篇"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap tabular-nums">
                    {position.index + 1} / {position.total}
                  </span>
                  <button
                    onClick={onNext}
                    disabled={position.index >= position.total - 1}
                    className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                    aria-label="下一篇"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : <div className="w-1" />}

              <div className="flex-1" />
              <button
                onClick={startEdit}
                className="px-3 py-2.5 rounded-xl text-blue-500 hover:bg-blue-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Pencil className="w-4 h-4" />編輯
              </button>
              <button
                onClick={remove}
                className="px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />刪除
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
