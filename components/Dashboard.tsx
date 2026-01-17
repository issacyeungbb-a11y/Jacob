
import React, { useMemo, useState, useEffect } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog, SleepQuality } from '../types';
import { Milk, Moon, Baby, Clock, Zap, Sun, Play, Square, Edit3, X, Check } from 'lucide-react';
import { NIGHT_START_HOUR, NIGHT_END_HOUR } from '../constants';

interface DashboardProps {
  logs: BabyLog[];
  isSleeping: boolean;
  sleepStartTime: string | null;
  onStartSleep: (startTime: string) => void;
  onEndSleep: (log: BabyLog) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ logs, isSleeping, sleepStartTime, onStartSleep, onEndSleep }) => {
  const today = new Date().toDateString();
  const [elapsed, setElapsed] = useState<string>("0h 0m");
  
  // Manual Time Adjustment State
  const [isAdjustingTime, setIsAdjustingTime] = useState(false);
  const [manualTime, setManualTime] = useState<string>("");

  const toLocalISO = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  // Sync manual time with current time when opening adjustment
  useEffect(() => {
    if (isAdjustingTime) {
        setManualTime(toLocalISO(new Date()));
    }
  }, [isAdjustingTime]);

  // Timer for active sleep
  useEffect(() => {
    if (!isSleeping || !sleepStartTime) return;

    const updateTimer = () => {
        const start = new Date(sleepStartTime).getTime();
        const now = new Date().getTime();
        const diffMs = now - start;
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setElapsed(`${hrs}小時 ${mins}分`);
    };

    const interval = setInterval(updateTimer, 60000); 
    updateTimer(); // Initial call

    return () => clearInterval(interval);
  }, [isSleeping, sleepStartTime]);

  // --- Logic: One-Tap Actions ---
  const handleToggleSleep = () => {
      const actionTime = isAdjustingTime ? new Date(manualTime).toISOString() : new Date().toISOString();

      if (isSleeping) {
          // Wake Up
          if (!sleepStartTime) return;
          const start = new Date(sleepStartTime).getTime();
          const end = new Date(actionTime).getTime();
          let duration = Math.floor((end - start) / (1000 * 60));
          
          if (duration < 0) {
              alert("起床時間不能早於入睡時間");
              return;
          }
          if (duration === 0) duration = 1; // Minimum 1 min

          const newLog: BabyLog = {
              id: Date.now().toString(),
              timestamp: actionTime,
              type: LogType.SLEEP,
              durationMinutes: duration,
              quality: 'GOOD' // Default to GOOD for one-tap, user can edit later
          };
          onEndSleep(newLog);
      } else {
          // Go to Sleep
          onStartSleep(actionTime);
      }
      setIsAdjustingTime(false);
  };

  // --- Logic: Night Sleep Summary ---
  const nightStats = useMemo(() => {
    // 邏輯：取得「最近一個完成的夜晚」或「正在進行的夜晚」
    // 定義：昨晚 21:00 到 今早 09:00
    const now = new Date();
    const currentHour = now.getHours();
    
    let targetNightStart = new Date();
    let targetNightEnd = new Date();

    // 如果現在還沒到早上 9 點，我們看的是「前天晚上到昨天早上」還是「昨天晚上到今天早上」？
    // 需求說「每天早上九點更新昨晚睡眠」。
    // 所以如果在今天 10:00 AM，我看的是 Yesterday 21:00 - Today 09:00。
    
    targetNightStart.setHours(NIGHT_START_HOUR, 0, 0, 0);
    targetNightEnd.setHours(NIGHT_END_HOUR, 0, 0, 0);

    // 如果現在時間還沒過今天的 21:00，那 targetNightStart 應該是昨天
    if (currentHour < NIGHT_START_HOUR) {
        targetNightStart.setDate(targetNightStart.getDate() - 1);
    }
    // targetNightEnd 永遠是 targetNightStart 的隔天
    targetNightEnd = new Date(targetNightStart);
    targetNightEnd.setDate(targetNightEnd.getDate() + 1);
    targetNightEnd.setHours(NIGHT_END_HOUR, 0, 0, 0);

    // 找出所有相關的睡眠紀錄
    // 條件：睡眠結束時間 在 targetWindow 內，或者 睡眠時段與 targetWindow 重疊
    const relevantLogs = logs.filter(l => {
        if (l.type !== LogType.SLEEP) return false;
        const sleepLog = l as SleepLog;
        const logEnd = new Date(sleepLog.timestamp);
        const logStart = new Date(logEnd.getTime() - sleepLog.durationMinutes * 60000);

        // 檢查重疊：(LogStart < NightEnd) AND (LogEnd > NightStart)
        return logStart < targetNightEnd && logEnd > targetNightStart;
    });

    let totalMinutes = 0;
    let maxStretch = 0;
    let wakeCount = 0;

    relevantLogs.forEach(l => {
        const sleepLog = l as SleepLog;
        const logEnd = new Date(sleepLog.timestamp);
        const logStart = new Date(logEnd.getTime() - sleepLog.durationMinutes * 60000);

        // 計算這個 log 在夜間視窗內的有效長度
        const effectiveStart = logStart < targetNightStart ? targetNightStart : logStart;
        const effectiveEnd = logEnd > targetNightEnd ? targetNightEnd : logEnd;

        if (effectiveEnd > effectiveStart) {
            const duration = (effectiveEnd.getTime() - effectiveStart.getTime()) / 60000;
            totalMinutes += duration;
            if (duration > maxStretch) maxStretch = duration;
        }
    });
    
    // 醒來次數 = 睡眠段數 - 1 (如果只有一段就是一覺到天亮，0次醒來)
    // 但如果完全沒睡，wakeCount 應該是 0
    wakeCount = relevantLogs.length > 0 ? relevantLogs.length - 1 : 0; 
    // 或者單純顯示分開睡了幾次
    const segments = relevantLogs.length;

    return { 
        totalHours: Math.floor(totalMinutes / 60), 
        totalMins: Math.floor(totalMinutes % 60),
        maxStretchHrs: (maxStretch / 60).toFixed(1),
        segments,
        rangeLabel: `${targetNightStart.getMonth()+1}/${targetNightStart.getDate()} 晚`
    };
  }, [logs]);

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
      
      {/* 1. Big Toggle Button */}
      <div className="bg-white rounded-3xl shadow-lg p-2 border border-blue-50">
         {isAdjustingTime ? (
             <div className="p-4 animate-fade-in">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700">設定{isSleeping ? '起床' : '入睡'}時間</label>
                    <button onClick={() => setIsAdjustingTime(false)} className="p-1 bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
                 </div>
                 <input 
                    type="datetime-local" 
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl text-lg font-bold mb-3 border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                 />
                 <button 
                    onClick={handleToggleSleep}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                 >
                    <Check className="w-5 h-5" /> 確認儲存
                 </button>
             </div>
         ) : (
             <div className="flex">
                 <button 
                    onClick={handleToggleSleep}
                    className={`flex-1 py-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                        isSleeping 
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-200' 
                        : 'bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-orange-100'
                    } shadow-xl`}
                 >
                    {isSleeping ? (
                        <>
                           <Sun className="w-12 h-12 animate-pulse" />
                           <span className="text-2xl font-black tracking-widest">點擊起床</span>
                           <span className="text-sm font-medium opacity-90 bg-black/10 px-3 py-1 rounded-full">
                             已睡 {elapsed}
                           </span>
                        </>
                    ) : (
                        <>
                           <Moon className="w-12 h-12" />
                           <span className="text-2xl font-black tracking-widest">點擊睡覺</span>
                           <span className="text-sm font-medium opacity-90">Jacob 醒著</span>
                        </>
                    )}
                 </button>

                 <button 
                    onClick={() => setIsAdjustingTime(true)}
                    className="w-12 ml-2 flex flex-col items-center justify-center gap-1 bg-gray-50 rounded-2xl text-gray-400 hover:bg-gray-100 border border-gray-100"
                 >
                    <Edit3 className="w-5 h-5" />
                    <span className="text-[10px] font-bold writing-vertical">手動</span>
                 </button>
             </div>
         )}
      </div>

      {/* 2. Night Sleep Summary Card (Top Priority) */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
              <Moon className="w-24 h-24 text-indigo-300" />
          </div>
          <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-indigo-500/30 rounded-lg">
                    <Moon className="w-4 h-4 text-indigo-200" />
                  </div>
                  <span className="text-sm font-bold text-indigo-200 uppercase tracking-wider">
                      昨晚睡眠 ({nightStats.rangeLabel})
                  </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center divide-x divide-white/10">
                  <div>
                      <div className="text-xs text-slate-400 mb-1">總時數</div>
                      <div className="text-xl font-black">{nightStats.totalHours}<span className="text-xs font-normal text-slate-400">h</span> {nightStats.totalMins}<span className="text-xs font-normal text-slate-400">m</span></div>
                  </div>
                  <div>
                      <div className="text-xs text-slate-400 mb-1">分段次數</div>
                      <div className="text-xl font-black">{nightStats.segments} <span className="text-xs font-normal text-slate-400">次</span></div>
                  </div>
                  <div>
                      <div className="text-xs text-slate-400 mb-1">最長連續</div>
                      <div className="text-xl font-black text-emerald-400">{nightStats.maxStretchHrs} <span className="text-xs font-normal text-slate-400">h</span></div>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. Other Daily Stats */}
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
