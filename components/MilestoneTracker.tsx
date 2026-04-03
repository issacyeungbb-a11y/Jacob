import React, { useMemo } from 'react';
import { BabyLog, LogType, MilestoneLog } from '../types';
import { MILESTONES } from '../constants';
import { Flag, CheckCircle2, Circle, Check } from 'lucide-react';
import { addLogToCloud, deleteLogFromCloud } from '../services/storageService';

interface MilestoneTrackerProps {
  logs: BabyLog[];
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ logs }) => {
  const milestoneLogs = useMemo(() => {
    return logs.filter(l => l.type === LogType.MILESTONE) as MilestoneLog[];
  }, [logs]);

  const completedMilestoneMap = useMemo(() => {
    const map = new Map<string, string>(); // milestoneId -> logId
    milestoneLogs.forEach(l => map.set(l.milestoneId, l.id));
    return map;
  }, [milestoneLogs]);

  const milestonesByMonth = useMemo(() => {
    const grouped: Record<number, typeof MILESTONES> = {};
    MILESTONES.forEach(m => {
      if (!grouped[m.month]) grouped[m.month] = [];
      grouped[m.month].push(m);
    });
    return grouped;
  }, []);

  const handleToggleMilestone = async (milestoneId: string) => {
    const existingLogId = completedMilestoneMap.get(milestoneId);
    
    if (existingLogId) {
      // Remove milestone
      await deleteLogFromCloud(existingLogId);
    } else {
      // Add milestone
      const newLog: MilestoneLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: LogType.MILESTONE,
        milestoneId: milestoneId
      };
      await addLogToCloud(newLog);
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Flag className="w-5 h-5 text-purple-500" />
            發展里程碑紀錄
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">點擊方格即可標記 Jacob 已完成的里程碑</p>
        </div>
        <span className="text-[9px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 text-right">
          參考: 美國 CDC & 香港衞生署
        </span>
      </div>

      <div className="space-y-8">
        {Object.entries(milestonesByMonth).sort(([a], [b]) => Number(a) - Number(b)).map(([month, milestones]) => (
          <div key={month} className="overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-purple-100"></div>
              <h4 className="text-sm font-black text-purple-800 px-3 py-1 bg-purple-50 rounded-full border border-purple-100">
                {month} 個月里程碑
              </h4>
              <div className="h-px flex-1 bg-purple-100"></div>
            </div>

            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-wider w-20">類別</th>
                    <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">里程碑內容</th>
                    <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-wider w-16 text-center">完成</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, idx) => {
                    const isCompleted = completedMilestoneMap.has(m.id);
                    return (
                      <tr 
                        key={m.id} 
                        className={`border-b border-gray-50 last:border-0 transition-colors cursor-pointer hover:bg-purple-50/30 ${isCompleted ? 'bg-purple-50/20' : ''}`}
                        onClick={() => handleToggleMilestone(m.id)}
                      >
                        <td className="py-3 px-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                            m.category.includes('大肌肉') ? 'bg-blue-100 text-blue-600' :
                            m.category.includes('細肌肉') ? 'bg-emerald-100 text-emerald-600' :
                            m.category.includes('語言') ? 'bg-amber-100 text-amber-600' :
                            m.category.includes('社交') ? 'bg-rose-100 text-rose-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {m.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className={`text-xs font-medium leading-relaxed ${isCompleted ? 'text-gray-800' : 'text-gray-500'}`}>
                            {m.name}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className={`w-6 h-6 mx-auto rounded-lg border-2 flex items-center justify-center transition-all ${
                            isCompleted 
                              ? 'bg-purple-500 border-purple-500 shadow-sm' 
                              : 'bg-white border-gray-200'
                          }`}>
                            {isCompleted && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
