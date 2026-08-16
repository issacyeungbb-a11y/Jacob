import React, { useMemo, useState } from 'react';
import { BabyLog, LogType, VaccineLog } from '../types';
import { HK_VACCINES } from '../constants';
import { BABY_NAME, getBirthDate } from '../services/config';
import { Syringe, CheckCircle2, Circle, AlertTriangle, X, Check, Undo2 } from 'lucide-react';

interface VaccineTrackerProps {
  logs: BabyLog[];
  onAddLog: (log: BabyLog) => void;
  onDeleteLog: (id: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const localDateStr = (d: Date) => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
};

export const VaccineTracker: React.FC<VaccineTrackerProps> = ({ logs, onAddLog, onDeleteLog }) => {
  // 撳咗「標記接種」但仲未確認日期嗰支疫苗
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState(() => localDateStr(new Date()));

  /** 疫苗 id → 已接種嘅記錄 */
  const logByVaccine = useMemo(() => {
    const map = new Map<string, VaccineLog>();
    (logs.filter(l => l.type === LogType.VACCINE) as VaccineLog[])
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach(l => map.set(l.vaccineId, l));
    return map;
  }, [logs]);

  const vaccinesByMonth = useMemo(() => {
    const grouped: Record<number, typeof HK_VACCINES> = {};
    HK_VACCINES.forEach(v => {
      if (!grouped[v.month]) grouped[v.month] = [];
      grouped[v.month].push(v);
    });
    return grouped;
  }, []);

  /** BB 而家幾多個月大，用嚟判斷邊幾針已經到期 */
  const ageMonths = useMemo(() => {
    const days = Math.floor((Date.now() - getBirthDate().getTime()) / DAY_MS);
    return days / 30.4375;
  }, []);

  const doneCount = HK_VACCINES.filter(v => logByVaccine.has(v.id)).length;
  const dueCount = HK_VACCINES.filter(v => !logByVaccine.has(v.id) && ageMonths >= v.month).length;

  const startMark = (id: string) => {
    setPendingId(id);
    setPendingDate(localDateStr(new Date()));
  };

  const confirmMark = (vaccineId: string) => {
    // 用揀咗嘅日子，時間補返中午，避免時區前後一日跳走
    const [y, m, d] = pendingDate.split('-').map(Number);
    if (!y || !m || !d) return;
    const ts = new Date(y, m - 1, d, 12, 0, 0);
    onAddLog({
      id: Date.now().toString(),
      type: LogType.VACCINE,
      timestamp: ts.toISOString(),
      vaccineId,
    } as BabyLog);
    setPendingId(null);
  };

  const undoMark = (v: { id: string; name: string }) => {
    const existing = logByVaccine.get(v.id);
    if (!existing) return;
    if (!window.confirm(`取消「${v.name}」嘅接種記錄？`)) return;
    onDeleteLog(existing.id);
  };

  const monthLabel = (m: number) => (m === 0 ? '初生' : `${m} 個月`);

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-2 gap-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Syringe className="w-5 h-5 text-teal-500" />
          疫苗接種紀錄
        </h3>
        <span className="text-[9px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 text-right leading-tight">
          香港兒童免疫接種計劃<br />衞生署家庭健康服務
        </span>
      </div>

      {/* 進度 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${(doneCount / HK_VACCINES.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] font-black text-teal-700 tabular-nums whitespace-nowrap">
          {doneCount} / {HK_VACCINES.length}
        </span>
      </div>

      {dueCount > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-2.5 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            按 {BABY_NAME} 嘅月齡，有 <b>{dueCount}</b> 針已到期但未有接種記錄。
            如果已經打咗，撳一下就可以補返記錄。
          </p>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(vaccinesByMonth)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([month, vaccines]) => {
            const m = Number(month);
            const reached = ageMonths >= m;
            return (
              <div key={month} className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-black text-teal-800">{monthLabel(m)}</h4>
                  {!reached && (
                    <span className="text-[9px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                      未到接種年齡
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {vaccines.map(v => {
                    const done = logByVaccine.get(v.id);
                    const isPending = pendingId === v.id;
                    const overdue = !done && reached;

                    return (
                      <div key={v.id}>
                        <div
                          className={`flex items-start gap-3 p-2 rounded-xl transition-colors ${
                            done ? 'bg-white shadow-sm' : overdue ? 'bg-white/60' : 'opacity-70'
                          }`}
                        >
                          <button
                            onClick={() => (done ? undoMark(v) : startMark(v.id))}
                            className="shrink-0 mt-0.5 rounded-full hover:scale-110 active:scale-95 transition-transform"
                            aria-label={done ? `取消 ${v.name} 嘅接種記錄` : `標記 ${v.name} 已接種`}
                            title={done ? '撳一下取消記錄' : '撳一下標記已接種'}
                          >
                            {done ? (
                              <CheckCircle2 className="w-5 h-5 text-teal-500" />
                            ) : (
                              <Circle className={`w-5 h-5 ${overdue ? 'text-amber-400' : 'text-teal-200'}`} />
                            )}
                          </button>

                          <button
                            onClick={() => (done ? undoMark(v) : startMark(v.id))}
                            className="flex-1 min-w-0 text-left"
                          >
                            <span className={`block text-sm font-medium leading-snug ${done ? 'text-gray-800' : 'text-gray-500'}`}>
                              {v.name}
                            </span>
                            {done ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-teal-600 font-bold mt-0.5 tabular-nums">
                                <Check className="w-3 h-3" />
                                {new Date(done.timestamp).toLocaleDateString('zh-HK', {
                                  year: 'numeric', month: 'long', day: 'numeric',
                                })} 已接種
                              </span>
                            ) : overdue ? (
                              <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">
                                已到期 · 撳一下標記已接種
                              </span>
                            ) : null}
                          </button>

                          {done && (
                            <button
                              onClick={() => undoMark(v)}
                              className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="取消記錄"
                              title="取消記錄"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* 揀接種日期 */}
                        {isPending && !done && (
                          <div className="mt-1 ml-8 mr-1 bg-white border border-teal-200 rounded-xl p-2.5 animate-fade-in">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1.5">
                              邊日接種？
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                value={pendingDate}
                                max={localDateStr(new Date())}
                                onChange={e => setPendingDate(e.target.value)}
                                className="flex-1 min-w-0 p-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-teal-400 outline-none text-xs font-bold text-gray-800"
                              />
                              <button
                                onClick={() => confirmMark(v.id)}
                                className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-black flex items-center gap-1 hover:bg-teal-700 transition-colors shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />確認
                              </button>
                              <button
                                onClick={() => setPendingId(null)}
                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
                                aria-label="取消"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      <p className="text-[10px] text-gray-400 leading-relaxed mt-4 pt-3 border-t border-gray-50">
        以上為母嬰健康院提供嘅接種項目（初生至 18 個月）。小一至小六嘅加強劑由衞生署學童免疫注射小組
        喺學校提供，未計入此表。實際安排以母嬰健康院嘅針卡為準。
      </p>
    </div>
  );
};
