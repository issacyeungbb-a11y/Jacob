
import React, { useMemo } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog, DiaperLog } from '../types';
import { Calendar, Milk, Moon, Baby, TrendingUp, Info } from 'lucide-react';

interface WeeklyReportProps {
  logs: BabyLog[];
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ logs }) => {
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => new Date(log.timestamp) >= sevenDaysAgo);
    
    // Group by day
    const dailyData: Record<string, { milk: number, sleep: number, diapers: number }> = {};
    
    recentLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString();
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { milk: 0, sleep: 0, diapers: 0 };
      }
      
      if (log.type === LogType.FEED) {
        dailyData[dateStr].milk += (log as FeedLog).amountMl || 0;
      } else if (log.type === LogType.SLEEP) {
        dailyData[dateStr].sleep += (log as SleepLog).durationMinutes || 0;
      } else if (log.type === LogType.DIAPER) {
        dailyData[dateStr].diapers += 1;
      }
    });

    const days = Object.keys(dailyData);
    const dayCount = days.length || 1;
    
    const totalMilk = Object.values(dailyData).reduce((sum, d) => sum + d.milk, 0);
    const totalSleep = Object.values(dailyData).reduce((sum, d) => sum + d.sleep, 0);
    const totalDiapers = Object.values(dailyData).reduce((sum, d) => sum + d.diapers, 0);

    return {
      avgMilk: Math.round(totalMilk / dayCount),
      avgSleep: Math.round(totalSleep / dayCount),
      avgDiapers: (totalDiapers / dayCount).toFixed(1),
      totalMilk,
      totalSleep,
      totalDiapers,
      dayCount
    };
  }, [logs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Calendar className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-300" />
            每週成長報告
          </h2>
          <p className="text-indigo-100 text-sm leading-relaxed">
            總結過去 7 天的數據，助您掌握 Jacob 的成長趨勢。
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Milk Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-50 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <Milk className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">平均每日奶量</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{weeklyStats.avgMilk}</span>
              <span className="text-sm font-bold text-gray-500">ml</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">總計</p>
            <p className="text-sm font-black text-blue-600">{weeklyStats.totalMilk} ml</p>
          </div>
        </div>

        {/* Sleep Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-indigo-50 flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-2xl">
            <Moon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">平均每日睡眠</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{Math.floor(weeklyStats.avgSleep / 60)}h {weeklyStats.avgSleep % 60}m</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">總計</p>
            <p className="text-sm font-black text-indigo-600">{Math.floor(weeklyStats.totalSleep / 60)}h</p>
          </div>
        </div>

        {/* Diaper Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-50 flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <Baby className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">平均每日換片</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{weeklyStats.avgDiapers}</span>
              <span className="text-sm font-bold text-gray-500">次</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">總計</p>
            <p className="text-sm font-black text-amber-600">{weeklyStats.totalDiapers} 次</p>
          </div>
        </div>
      </div>

      {/* Summary Note */}
      <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-blue-800">小提示</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            這份週報是基於您過去 {weeklyStats.dayCount} 天的記錄自動生成的。規律的記錄有助於更準確地分析 Jacob 的成長狀況。
          </p>
        </div>
      </div>
    </div>
  );
};
