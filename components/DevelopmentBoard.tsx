import React, { useMemo } from 'react';
import { BabyLog, LogType, VaccineLog, MilestoneLog } from '../types';
import { HK_VACCINES, MILESTONES } from '../constants';
import { Syringe, Flag, CheckCircle2, Circle } from 'lucide-react';

interface DevelopmentBoardProps {
  logs: BabyLog[];
}

export const DevelopmentBoard: React.FC<DevelopmentBoardProps> = ({ logs }) => {
  // Get completed vaccines
  const completedVaccines = useMemo(() => {
    const vaccineLogs = logs.filter(l => l.type === LogType.VACCINE) as VaccineLog[];
    return new Set(vaccineLogs.map(l => l.vaccineId));
  }, [logs]);

  // Get completed milestones
  const completedMilestones = useMemo(() => {
    const milestoneLogs = logs.filter(l => l.type === LogType.MILESTONE) as MilestoneLog[];
    return new Set(milestoneLogs.map(l => l.milestoneId));
  }, [logs]);

  // Group milestones by month
  const milestonesByMonth = useMemo(() => {
    const grouped: Record<number, typeof MILESTONES> = {};
    MILESTONES.forEach(m => {
      if (!grouped[m.month]) grouped[m.month] = [];
      grouped[m.month].push(m);
    });
    return grouped;
  }, []);

  // Group vaccines by month
  const vaccinesByMonth = useMemo(() => {
    const grouped: Record<number, typeof HK_VACCINES> = {};
    HK_VACCINES.forEach(v => {
      if (!grouped[v.month]) grouped[v.month] = [];
      grouped[v.month].push(v);
    });
    return grouped;
  }, []);

  return (
    <div className="space-y-6">
      {/* Vaccination Tracker */}
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

      {/* Milestone Tracker */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Flag className="w-5 h-5 text-purple-500" />
            發展里程碑
          </h3>
          <span className="text-[9px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 text-right max-w-[120px]">
            資料來源: 美國 CDC &<br/>香港衞生署
          </span>
        </div>
        <div className="space-y-4">
          {Object.entries(milestonesByMonth).map(([month, milestones]) => (
            <div key={month} className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <h4 className="text-sm font-black text-purple-800 mb-3">{month} 個月</h4>
              <div className="space-y-2">
                {milestones.map(m => {
                  const isCompleted = completedMilestones.has(m.id);
                  return (
                    <div key={m.id} className={`flex items-start gap-3 p-2 rounded-xl transition-colors ${isCompleted ? 'bg-white shadow-sm' : 'opacity-70'}`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-purple-200 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 inline-block ${isCompleted ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                          {m.category}
                        </span>
                        <p className={`text-sm font-medium ${isCompleted ? 'text-gray-800' : 'text-gray-500'}`}>
                          {m.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
