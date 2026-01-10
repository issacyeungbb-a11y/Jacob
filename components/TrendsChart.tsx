
import React, { useState, useMemo } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog } from '../types';
import { BarChart3, Milk, Moon, Layers, CalendarDays } from 'lucide-react';

interface TrendsChartProps {
  logs: BabyLog[];
}

type ChartMode = 'MILK' | 'SLEEP' | 'DIAPER';
type TimeRange = 7 | 14 | 30;

export const TrendsChart: React.FC<TrendsChartProps> = ({ logs }) => {
  const [mode, setMode] = useState<ChartMode>('MILK');
  const [daysRange, setDaysRange] = useState<TimeRange>(7);

  // Helper: Generate last N days dates (YYYY-MM-DD)
  const chartDates = useMemo(() => {
    return Array.from({ length: daysRange }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - ((daysRange - 1) - i)); // Order from past to today
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
    });
  }, [daysRange]);

  // Calculate Data based on Mode and Range
  const chartData = useMemo(() => {
    return chartDates.map(dateStr => {
      const dayLogs = logs.filter(l => {
         if (!l.timestamp) return false;
         const logDate = new Date(l.timestamp);
         if (isNaN(logDate.getTime())) return false;

         // Convert log timestamp to local date string for comparison
         const offset = logDate.getTimezoneOffset() * 60000;
         const localLogDate = new Date(logDate.getTime() - offset).toISOString().split('T')[0];
         return localLogDate === dateStr;
      });

      let value = 0;
      if (mode === 'MILK') {
        value = dayLogs
          .filter(l => l.type === LogType.FEED)
          .reduce((sum, l) => sum + ((l as FeedLog).amountMl || 0), 0);
      } else if (mode === 'SLEEP') {
        const minutes = dayLogs
          .filter(l => l.type === LogType.SLEEP)
          .reduce((sum, l) => sum + ((l as SleepLog).durationMinutes || 0), 0);
        value = Number((minutes / 60).toFixed(1)); // Convert to hours
      } else if (mode === 'DIAPER') {
        value = dayLogs.filter(l => l.type === LogType.DIAPER).length;
      }

      // Format date for display (e.g., "12/19")
      const displayDate = new Date(dateStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
      
      return { date: dateStr, displayDate, value };
    });
  }, [logs, chartDates, mode]);

  // View Calculation
  const maxValue = Math.max(...chartData.map(d => d.value), 1); // Avoid div by 0
  const chartHeight = 160;
  
  const getBarHeight = (val: number) => (val / maxValue) * chartHeight;

  // Colors
  const getColor = () => {
    switch (mode) {
      case 'MILK': return 'text-blue-500 bg-blue-500';
      case 'SLEEP': return 'text-indigo-500 bg-indigo-500';
      case 'DIAPER': return 'text-amber-500 bg-amber-500';
    }
  };
  
  const getUnit = () => {
     switch (mode) {
      case 'MILK': return 'ml';
      case 'SLEEP': return 'hr';
      case 'DIAPER': return '次';
    }
  };

  const TabButton = ({ m, icon: Icon, label }: { m: ChartMode, icon: any, label: string }) => (
    <button
      onClick={() => setMode(m)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
        mode === m 
          ? `${getColor().split(' ')[1]} text-white shadow-md` 
          : 'bg-white text-gray-500 border border-gray-200'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  const RangeButton = ({ range, label }: { range: TimeRange, label: string }) => (
    <button
      onClick={() => setDaysRange(range)}
      className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors border ${
        daysRange === range
          ? 'bg-gray-800 text-white border-gray-800'
          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

  // Dynamic Styles based on range count
  const getBarWidthClass = () => {
    if (daysRange === 7) return 'max-w-[24px]';
    if (daysRange === 14) return 'max-w-[12px]';
    return 'max-w-[6px]';
  };

  const shouldShowLabel = (index: number) => {
    if (daysRange === 7) return true;
    if (daysRange === 14) return index % 2 === 0; // Show every 2nd
    return index % 5 === 0; // Show every 5th
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex flex-col gap-4 mb-6">
         <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              趨勢分析
            </h3>
            <div className="flex gap-1">
              <RangeButton range={7} label="7天" />
              <RangeButton range={14} label="14天" />
              <RangeButton range={30} label="30天" />
            </div>
         </div>
         
         <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <TabButton m="MILK" icon={Milk} label="奶量" />
            <TabButton m="SLEEP" icon={Moon} label="睡眠" />
            <TabButton m="DIAPER" icon={Layers} label="換片" />
         </div>
      </div>

      <div className="relative h-[200px] w-full flex items-end justify-between gap-1 px-1">
         {/* Background Grid Lines */}
         <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 pb-[20px]">
            <div className="border-t border-gray-400 w-full h-0 relative"><span className="absolute -top-3 left-0 text-[9px] text-gray-500">{maxValue}</span></div>
            <div className="border-t border-gray-400 w-full h-0"></div>
            <div className="border-t border-gray-400 w-full h-0 relative"><span className="absolute -top-3 left-0 text-[9px] text-gray-500">{Math.round(maxValue / 2)}</span></div>
            <div className="border-t border-gray-400 w-full h-0"></div>
            <div className="border-t border-gray-400 w-full h-0 relative"><span className="absolute -top-3 left-0 text-[9px] text-gray-500">0</span></div>
         </div>

         {chartData.map((d, i) => (
           <div key={i} className="flex flex-col items-center flex-1 z-10 group h-full justify-end">
              {/* Value Label (Hover only for tighter ranges) */}
              <div className="h-4 mb-1 relative w-full flex justify-center">
                 <span className={`absolute bottom-0 text-[9px] font-bold transition-opacity whitespace-nowrap bg-white/80 px-1 rounded shadow-sm z-20 ${
                    d.value === maxValue && daysRange === 7 
                      ? `${getColor().split(' ')[0]}` 
                      : 'text-gray-600 opacity-0 group-hover:opacity-100'
                 }`}>
                   {d.value}
                 </span>
              </div>
              
              {/* Bar */}
              <div 
                className={`w-full rounded-t-sm transition-all duration-500 ease-out ${getBarWidthClass()} ${
                  d.value === maxValue ? getColor().split(' ')[1] : 'bg-gray-200 group-hover:bg-gray-300'
                }`}
                style={{ height: `${Math.max(getBarHeight(d.value), 2)}px` }}
              ></div>
              
              {/* Date Label */}
              <div className="h-5 mt-1 flex items-start justify-center w-full">
                {shouldShowLabel(i) && (
                  <span className={`text-[9px] whitespace-nowrap transform ${daysRange > 7 ? 'scale-90' : ''} ${
                     new Date().getDate() === new Date(d.date).getDate() ? 'text-gray-800 font-bold' : 'text-gray-400'
                  }`}>
                    {d.displayDate}
                  </span>
                )}
              </div>
           </div>
         ))}
      </div>
      
      <div className="mt-2 text-center bg-gray-50 rounded-lg py-2">
         <p className="text-xs text-gray-500">
           {daysRange}日平均: <span className="font-bold text-gray-700 text-sm">
             {Math.round(chartData.reduce((a, b) => a + b.value, 0) / daysRange)} {getUnit()}
           </span>
         </p>
      </div>
    </div>
  );
};
