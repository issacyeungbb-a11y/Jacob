import React, { useMemo, useState, useEffect } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog } from '../types';
import { Milk, Moon, Baby, Clock, Zap } from 'lucide-react';

interface DashboardProps {
  logs: BabyLog[];
  isSleeping: boolean;
  sleepStartTime: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ logs, isSleeping, sleepStartTime }) => {
  const today = new Date().toDateString();
  const [elapsed, setElapsed] = useState<string>("0h 0m");

  // Timer for active sleep
  useEffect(() => {
    if (!isSleeping || !sleepStartTime) return;

    const interval = setInterval(() => {
        const start = new Date(sleepStartTime).getTime();
        const now = new Date().getTime();
        const diffMs = now - start;
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setElapsed(`${hrs}小時 ${mins}分`);
    }, 60000); // Update every minute

    // Initial set
    const start = new Date(sleepStartTime).getTime();
    const now = new Date().getTime();
    const diffMs = now - start;
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    setElapsed(`${hrs}小時 ${mins}分`);

    return () => clearInterval(interval);
  }, [isSleeping, sleepStartTime]);

  const stats = useMemo(() => {
    const todaysLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);
    
    const totalMilk = todaysLogs
      .filter(l => l.type === LogType.FEED)
      .reduce((sum, l) => sum + ((l as FeedLog).amountMl || 0), 0);

    const totalSleepMinutes = todaysLogs
      .filter(l => l.type === LogType.SLEEP)
      .reduce((sum, l) => sum + ((l as SleepLog).durationMinutes || 0), 0);
    
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

    return { totalMilk, totalSleepMinutes, diaperCount, timeSinceFeed };
  }, [logs, today]);

  return (
    <div className="space-y-4">
      {isSleeping && (
        <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden animate-pulse-slow">
            <div className="absolute right-[-20px] top-[-20px] opacity-20">
                <Moon className="w-32 h-32" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                    <span className="text-sm font-bold text-indigo-200 uppercase tracking-widest">目前正在睡覺</span>
                </div>
                <div className="text-4xl font-black mb-1 font-mono tracking-tight">
                    {elapsed}
                </div>
                <div className="text-indigo-200 text-xs">
                    入睡時間: {new Date(sleepStartTime!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-100 p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <Milk className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">今日奶量</span>
          <span className="text-2xl font-extrabold text-blue-700">{stats.totalMilk} ml</span>
        </div>
        
        <div className="bg-indigo-100 p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <Moon className="w-8 h-8 text-indigo-500 mb-2" />
          <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">今日累計</span>
          <span className="text-2xl font-extrabold text-indigo-700">
            {Math.floor(stats.totalSleepMinutes / 60)}小時 {stats.totalSleepMinutes % 60}分
          </span>
        </div>

        <div className="bg-amber-100 p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <Baby className="w-8 h-8 text-amber-500 mb-2" />
          <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">換片次數</span>
          <span className="text-2xl font-extrabold text-amber-700">{stats.diaperCount}</span>
        </div>

        <div className="bg-emerald-100 p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <Clock className="w-8 h-8 text-emerald-500 mb-2" />
          <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">上次餵奶</span>
          <span className="text-xl font-extrabold text-emerald-700">{stats.timeSinceFeed}</span>
        </div>
      </div>
    </div>
  );
};