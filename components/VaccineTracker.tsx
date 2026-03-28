import React, { useMemo } from 'react';
import { BabyLog, LogType, VaccineLog } from '../types';
import { HK_VACCINES } from '../constants';
import { Syringe, CheckCircle2, Circle } from 'lucide-react';

interface VaccineTrackerProps {
  logs: BabyLog[];
}

export const VaccineTracker: React.FC<VaccineTrackerProps> = ({ logs }) => {
  const completedVaccines = useMemo(() => {
    const vaccineLogs = logs.filter(l => l.type === LogType.VACCINE) as VaccineLog[];
    return new Set(vaccineLogs.map(l => l.vaccineId));
  }, [logs]);

  const vaccinesByMonth = useMemo(() => {
    const grouped: Record<number, typeof HK_VACCINES> = {};
    HK_VACCINES.forEach(v => {
      if (!grouped[v.month]) grouped[v.month] = [];
      grouped[v.month].push(v);
    });
    return grouped;
  }, []);

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Syringe className="w-5 h-5 text-teal-500" />
          疫苗接種紀錄
        </h3>
        <span className="text-[9px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
          資料來源: 香港衞生署
        </span>
      </div>
      <div className="space-y-4">
        {Object.entries(vaccinesByMonth).map(([month, vaccines]) => (
          <div key={month} className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100">
            <h4 className="text-sm font-black text-teal-800 mb-3">{month} 個月</h4>
            <div className="space-y-2">
              {vaccines.map(v => {
                const isCompleted = completedVaccines.has(v.id);
                return (
                  <div key={v.id} className={`flex items-start gap-3 p-2 rounded-xl transition-colors ${isCompleted ? 'bg-white shadow-sm' : 'opacity-70'}`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-teal-200 shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm font-medium ${isCompleted ? 'text-gray-800' : 'text-gray-500'}`}>
                      {v.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
