
import React, { useMemo } from 'react';
import { BabyLog, LogType, FeedLog } from '../types';
import { Milk, Baby, Clock } from 'lucide-react';

interface DashboardProps {
  logs: BabyLog[];
}

export const Dashboard: React.FC<DashboardProps> = ({ logs }) => {
  const today = new Date().toDateString();
  
  // --- Logic: Daily Stats ---
  const stats = useMemo(() => {
    const todaysLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);
    
    const totalMilk = todaysLogs
      .filter(l => l.type === LogType.FEED)
      .reduce((sum, l) => sum + ((l as FeedLog).amountMl || 0), 0);

    const diaperCount = todaysLogs.filter(l => l.type === LogType.DIAPER).length;

    // Last feed calculation
    const feeds = logs.filter(l => l.type === LogType.FEED).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const lastFeed = feeds.length > 0 ? feeds[0] : null;
    
    let timeSinceFeed = "無";
    if (lastFeed) {
      const diffMs = new Date().getTime() - new Date(lastFeed.timestamp).getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      timeSinceFeed = `${diffHrs}小時 ${diffMins}分`;
    }

    return { totalMilk, diaperCount, timeSinceFeed };
  }, [logs, today]);

  return (
    <div className="space-y-6">
      {/* Daily Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm border border-blue-100">
          <Milk className="w-6 h-6 text-blue-500 mb-1" />
          <span className="text-[10px] text-blue-400 font-bold uppercase">今日奶量</span>
          <span className="text-lg font-black text-blue-700">{stats.totalMilk} ml</span>
        </div>
        
        <div className="bg-amber-50 p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm border border-amber-100">
          <Baby className="w-6 h-6 text-amber-500 mb-1" />
          <span className="text-[10px] text-amber-400 font-bold uppercase">換片</span>
          <span className="text-lg font-black text-amber-700">{stats.diaperCount} 次</span>
        </div>

        <div className="bg-emerald-50 p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm border border-emerald-100">
          <Clock className="w-6 h-6 text-emerald-500 mb-1" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase">距上次奶</span>
          <span className="text-lg font-black text-emerald-700 whitespace-nowrap text-xs">{stats.timeSinceFeed}</span>
        </div>
      </div>
    </div>
  );
};
