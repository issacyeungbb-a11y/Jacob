import React, { useMemo } from 'react';
import { BabyLog } from '../types';
import { MILESTONES } from '../constants';
import { Flag } from 'lucide-react';

interface MilestoneTrackerProps {
  logs: BabyLog[];
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = () => {
  const milestonesByMonth = useMemo(() => {
    const grouped: Record<number, typeof MILESTONES> = {};
    MILESTONES.forEach(m => {
      if (!grouped[m.month]) grouped[m.month] = [];
      grouped[m.month].push(m);
    });
    return grouped;
  }, []);

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Flag className="w-5 h-5 text-purple-500" />
            發展里程碑參考
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">本資料庫僅供發展階段對照與指標參考</p>
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
                    <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-wider w-24">類別</th>
                    <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">里程碑內容</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => {
                    return (
                      <tr 
                        key={m.id} 
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap ${
                            m.category.includes('大肌肉') ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            m.category.includes('細肌肉') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            m.category.includes('語言') ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            m.category.includes('社交') ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-purple-50 text-purple-600 border border-purple-100'
                          }`}>
                            {m.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-medium leading-relaxed text-gray-700">
                            {m.name}
                          </p>
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
