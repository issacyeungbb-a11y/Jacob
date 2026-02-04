
import React, { useState, useMemo } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog, DiaperLog, DiaperType, OtherLog } from '../types';
import { BarChart3, Milk, Moon, Layers, Clock, Check } from 'lucide-react';

interface TrendsChartProps {
  logs: BabyLog[];
}

type ChartMode = 'MILK' | 'SLEEP' | 'DIAPER';
type TimeRange = 7 | 14 | 30;
type PatternKey = 'FEED' | 'WET' | 'DIRTY' | 'BATH';

export const TrendsChart: React.FC<TrendsChartProps> = ({ logs }) => {
  const [mode, setMode] = useState<ChartMode>('MILK');
  const [daysRange, setDaysRange] = useState<TimeRange>(7);

  // Filter State for Pattern Chart
  const [visiblePatterns, setVisiblePatterns] = useState<Record<PatternKey, boolean>>({
    FEED: true,
    WET: true,
    DIRTY: true,
    BATH: true
  });

  const togglePattern = (key: PatternKey) => {
    setVisiblePatterns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper: Generate last N days dates (YYYY-MM-DD)
  const chartDates = useMemo(() => {
    return Array.from({ length: daysRange }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - ((daysRange - 1) - i)); // Order from past to today
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
    });
  }, [daysRange]);

  // --- BAR CHART DATA (Top Section) ---
  const chartData = useMemo(() => {
    return chartDates.map(dateStr => {
      const dayLogs = logs.filter(l => {
         if (!l.timestamp) return false;
         const logDate = new Date(l.timestamp);
         if (isNaN(logDate.getTime())) return false;

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

      const displayDate = new Date(dateStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
      return { date: dateStr, displayDate, value };
    });
  }, [logs, chartDates, mode]);

  // --- PATTERN CHART DATA (Bottom Section) ---
  // We need to map logs to specific coordinate points for each day
  const patternData = useMemo(() => {
      // Create a map for fast lookup: dateString -> logs[]
      const dateMap: Record<string, BabyLog[]> = {};
      chartDates.forEach(d => dateMap[d] = []);

      logs.forEach(l => {
          const d = new Date(l.timestamp);
          if (isNaN(d.getTime())) return;
          const offset = d.getTimezoneOffset() * 60000;
          const dateStr = new Date(d.getTime() - offset).toISOString().split('T')[0];
          
          if (dateMap[dateStr]) {
              dateMap[dateStr].push(l);
          }
      });

      return chartDates.map(dateStr => {
          const daysLogs = dateMap[dateStr] || [];
          // Map logs to visual points (0-100% of height)
          const points = daysLogs.map(log => {
             const d = new Date(log.timestamp);
             const totalMinutes = d.getHours() * 60 + d.getMinutes();
             const topPercent = (totalMinutes / 1440) * 100; // 1440 mins in a day
             
             let colorClass = 'bg-gray-300';
             let typeLabel = '';
             let zIndex = 10;
             let typeKey: PatternKey | null = null;

             // Determine Color and Type
             if (log.type === LogType.FEED) {
                 colorClass = 'bg-blue-500 border border-blue-600';
                 typeLabel = '飲奶';
                 zIndex = 20;
                 typeKey = 'FEED';
             } else if (log.type === LogType.DIAPER) {
                 const dLog = log as DiaperLog;
                 if (dLog.status === DiaperType.WET) {
                     colorClass = 'bg-amber-300 border border-amber-400';
                     typeLabel = '小便';
                     typeKey = 'WET';
                 } else {
                     colorClass = 'bg-orange-500 border border-orange-600';
                     typeLabel = '大便';
                     zIndex = 30; // Poo on top
                     typeKey = 'DIRTY';
                 }
             } else if (log.type === LogType.OTHER) {
                 const details = (log as OtherLog).details?.toLowerCase() || '';
                 if (details.includes('bath') || details.includes('洗澡') || details.includes('沖涼')) {
                     colorClass = 'bg-pink-400 border border-pink-500';
                     typeLabel = '沖涼';
                     zIndex = 25;
                     typeKey = 'BATH';
                 } else {
                    return null; // Skip generic others
                 }
             } else {
                 return null; // Skip Sleep/Health/Summary in this dot chart
             }

             return { topPercent, colorClass, typeLabel, zIndex, typeKey };
          }).filter(Boolean) as { topPercent: number, colorClass: string, typeLabel: string, zIndex: number, typeKey: PatternKey }[];

          const displayDate = new Date(dateStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
          const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

          return { date: dateStr, displayDate, points, isWeekend };
      });
  }, [logs, chartDates]);


  // --- BAR CHART HELPERS ---
  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const chartHeight = 160;
  const getBarHeight = (val: number) => (val / maxValue) * chartHeight;

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

  const getBarWidthClass = () => {
    if (daysRange === 7) return 'max-w-[24px]';
    if (daysRange === 14) return 'max-w-[12px]';
    return 'max-w-[6px]';
  };

  const shouldShowLabel = (index: number) => {
    if (daysRange === 7) return true;
    if (daysRange === 14) return index % 2 === 0;
    return index % 5 === 0;
  };

  // Legend Button Component
  const LegendToggle = ({ pKey, color, label }: { pKey: PatternKey, color: string, label: string }) => {
    const isActive = visiblePatterns[pKey];
    return (
      <button 
        onClick={() => togglePattern(pKey)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all duration-200 ${
           isActive 
           ? 'bg-white border-gray-200 shadow-sm opacity-100' 
           : 'bg-gray-50 border-transparent opacity-50 grayscale'
        }`}
      >
         <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
         <span className={`text-[10px] font-medium ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
         {isActive && <Check className="w-3 h-3 text-gray-400 ml-1" />}
      </button>
    );
  };

  return (
    <div className="space-y-6">
        
        {/* --- SECTION 1: BAR CHART (Existing) --- */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                    總量趨勢
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
                    <div className="h-4 mb-1 relative w-full flex justify-center">
                        <span className={`absolute bottom-0 text-[9px] font-bold transition-opacity whitespace-nowrap bg-white/80 px-1 rounded shadow-sm z-20 ${
                            d.value === maxValue && daysRange === 7 
                            ? `${getColor().split(' ')[0]}` 
                            : 'text-gray-600 opacity-0 group-hover:opacity-100'
                        }`}>
                        {d.value}
                        </span>
                    </div>
                    
                    <div 
                        className={`w-full rounded-t-sm transition-all duration-500 ease-out ${getBarWidthClass()} ${
                        d.value === maxValue ? getColor().split(' ')[1] : 'bg-gray-200 group-hover:bg-gray-300'
                        }`}
                        style={{ height: `${Math.max(getBarHeight(d.value), 2)}px` }}
                    ></div>
                    
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

        {/* --- SECTION 2: PATTERN CHART (New) --- */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
             <div className="flex flex-col mb-4 gap-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   <Clock className="w-5 h-5 text-gray-600" />
                   作息分布
                </h3>
                {/* Interactive Legend */}
                <div className="flex flex-wrap gap-2">
                   <LegendToggle pKey="FEED" color="bg-blue-500" label="飲奶" />
                   <LegendToggle pKey="WET" color="bg-amber-300" label="小便" />
                   <LegendToggle pKey="DIRTY" color="bg-orange-500" label="大便" />
                   <LegendToggle pKey="BATH" color="bg-pink-400" label="沖涼" />
                </div>
             </div>
             
             <div className="flex relative border border-gray-100 rounded-xl overflow-hidden bg-slate-50/50 h-[320px]">
                 {/* Y-Axis Labels (Fixed Left) */}
                 <div className="w-10 flex-shrink-0 flex flex-col justify-between text-[10px] text-gray-400 font-medium py-2 bg-white border-r border-gray-100 z-20 items-center select-none">
                     <span>00:00</span>
                     <span>06:00</span>
                     <span>12:00</span>
                     <span>18:00</span>
                     <span>23:59</span>
                 </div>

                 {/* Scrollable Chart Area */}
                 <div className="flex-1 overflow-x-auto no-scrollbar relative">
                    <div className="h-full flex min-w-full" style={{ width: `${Math.max(100, patternData.length * (daysRange === 30 ? 6 : 14))}%` }}>
                        
                        {/* Horizontal Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 py-2">
                             <div className="border-t border-gray-200 w-full h-0 dashed opacity-50"></div>
                             <div className="border-t border-gray-200 w-full h-0 dashed opacity-50"></div>
                             <div className="border-t border-gray-200 w-full h-0 dashed opacity-50"></div>
                             <div className="border-t border-gray-200 w-full h-0 dashed opacity-50"></div>
                             <div className="border-t border-gray-200 w-full h-0 dashed opacity-50"></div>
                        </div>

                        {patternData.map((day, idx) => (
                            <div key={idx} className={`flex-1 relative h-full border-r border-gray-100/50 flex flex-col justify-end group ${day.isWeekend ? 'bg-indigo-50/30' : ''}`}>
                                {/* Date Label at Bottom */}
                                <div className="absolute bottom-0 w-full text-center pb-1 z-10 bg-gradient-to-t from-white/90 to-transparent pt-4">
                                   <span className={`text-[9px] ${shouldShowLabel(idx) ? 'text-gray-500' : 'text-transparent'}`}>
                                      {day.displayDate.split('/')[1]}
                                   </span>
                                </div>

                                {/* Dots Area */}
                                <div className="absolute top-2 bottom-6 inset-x-0">
                                   {day.points.map((p, pIdx) => {
                                       // Toggle Visibility Here
                                       if (!visiblePatterns[p.typeKey]) return null;

                                       return (
                                           <div 
                                              key={pIdx}
                                              className={`absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full shadow-sm animate-fade-in ${p.colorClass}`}
                                              style={{ top: `${p.topPercent}%`, zIndex: p.zIndex }}
                                              title={`${day.displayDate} ${p.typeLabel}`}
                                           />
                                       );
                                   })}
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
        </div>
    </div>
  );
};
