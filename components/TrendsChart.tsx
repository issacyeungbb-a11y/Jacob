
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog, DiaperLog, DiaperType, OtherLog } from '../types';
import { BarChart3, Milk, Moon, Layers, Clock, Check, X, Info } from 'lucide-react';

interface TrendsChartProps {
  logs: BabyLog[];
}

type ChartMode = 'MILK' | 'SLEEP' | 'DIAPER';
type TimeRange = 7 | 14 | 30;
type PatternKey = 'FEED' | 'WET' | 'DIRTY' | 'BATH';

interface PointData {
  log: BabyLog;
  topPercent: number;
  colorClass: string;
  typeLabel: string;
  zIndex: number;
  typeKey: PatternKey;
  details: string;
  intervalDisplay: string | null;
}

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

  // Popup State
  const [selectedPoint, setSelectedPoint] = useState<{ data: PointData; x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const togglePattern = (key: PatternKey) => {
    setVisiblePatterns(prev => ({ ...prev, [key]: !prev[key] }));
    setSelectedPoint(null); // Close popup on toggle
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
            setSelectedPoint(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper: Generate last N days dates (YYYY-MM-DD)
  const chartDates = useMemo(() => {
    return Array.from({ length: daysRange }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - ((daysRange - 1) - i)); // Order from past to today
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
    });
  }, [daysRange]);

  // Helper: Get global sorted logs for interval calculation
  const sortedGlobalLogs = useMemo(() => {
      return [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [logs]);

  // Helper: Find interval since previous log of same type
  const getInterval = (currentLog: BabyLog) => {
      const currentIndex = sortedGlobalLogs.findIndex(l => l.id === currentLog.id);
      if (currentIndex <= 0) return null;

      // Search backwards for the same type
      for (let i = currentIndex - 1; i >= 0; i--) {
          const prevLog = sortedGlobalLogs[i];
          
          // Match types strictly
          if (prevLog.type === currentLog.type) {
              // Special case for Diaper: Match WET/DIRTY specifically if needed, 
              // but usually parents want to know "time since last diaper change" generally, 
              // or specific. Let's stick to strict type match (LogType.DIAPER).
              
              const diffMs = new Date(currentLog.timestamp).getTime() - new Date(prevLog.timestamp).getTime();
              const hrs = Math.floor(diffMs / (1000 * 60 * 60));
              const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              
              if (hrs > 24) return "> 1天"; // Too long to be relevant interval
              return `${hrs}小時 ${mins}分`;
          }
      }
      return null;
  };

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
          
          const points = daysLogs.map(log => {
             const d = new Date(log.timestamp);
             const totalMinutes = d.getHours() * 60 + d.getMinutes();
             const topPercent = (totalMinutes / 1440) * 100;
             
             let colorClass = 'bg-gray-300';
             let typeLabel = '';
             let details = '';
             let zIndex = 10;
             let typeKey: PatternKey | null = null;

             // Determine Color, Type and Details
             if (log.type === LogType.FEED) {
                 const fLog = log as FeedLog;
                 colorClass = 'bg-blue-500 ring-2 ring-blue-100';
                 typeLabel = '飲奶';
                 details = `${fLog.amountMl}ml (${fLog.feedType})`;
                 zIndex = 20;
                 typeKey = 'FEED';
             } else if (log.type === LogType.DIAPER) {
                 const dLog = log as DiaperLog;
                 if (dLog.status === DiaperType.WET) {
                     colorClass = 'bg-amber-300 ring-2 ring-amber-100';
                     typeLabel = '小便';
                     details = '濕尿片';
                     typeKey = 'WET';
                 } else {
                     colorClass = 'bg-orange-500 ring-2 ring-orange-100';
                     typeLabel = '大便';
                     details = dLog.status;
                     zIndex = 30;
                     typeKey = 'DIRTY';
                 }
             } else if (log.type === LogType.OTHER) {
                 const oLog = log as OtherLog;
                 const dText = oLog.details?.toLowerCase() || '';
                 if (dText.includes('bath') || dText.includes('洗澡') || dText.includes('沖涼')) {
                     colorClass = 'bg-pink-400 ring-2 ring-pink-100';
                     typeLabel = '沖涼';
                     details = oLog.details;
                     zIndex = 25;
                     typeKey = 'BATH';
                 } else {
                    return null;
                 }
             } else {
                 return null;
             }

             return { 
                 log,
                 topPercent, 
                 colorClass, 
                 typeLabel, 
                 zIndex, 
                 typeKey, 
                 details,
                 intervalDisplay: getInterval(log)
             };
          }).filter(Boolean) as PointData[];

          const displayDate = new Date(dateStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
          const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
          const fullDate = dateStr; // YYYY-MM-DD for checking

          return { date: dateStr, displayDate, fullDate, points, isWeekend };
      });
  }, [logs, chartDates, sortedGlobalLogs]); // Re-run if logs change


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

  const handlePointClick = (e: React.MouseEvent, point: PointData) => {
      e.stopPropagation();
      // Calculate position relative to viewport but centered horizontally on screen if mobile
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setSelectedPoint({
          data: point,
          x: rect.left + rect.width / 2,
          y: rect.top
      });
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

        {/* --- SECTION 2: PATTERN CHART (Updated) --- */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative" ref={chartRef}>
             <div className="flex flex-col mb-4 gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                       <Clock className="w-5 h-5 text-gray-600" />
                       作息分布
                    </h3>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                        <Info className="w-3 h-3" />
                        點擊圓點查看詳情
                    </div>
                </div>
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
                 <div className="w-10 flex-shrink-0 flex flex-col justify-between text-[10px] text-gray-400 font-medium py-2 bg-white border-r border-gray-100 z-20 items-center select-none shadow-sm">
                     <span>00:00</span>
                     <span>06:00</span>
                     <span>12:00</span>
                     <span>18:00</span>
                     <span>23:59</span>
                 </div>

                 {/* Scrollable Chart Area */}
                 <div className="flex-1 overflow-x-auto no-scrollbar relative touch-pan-x">
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
                                       if (!visiblePatterns[p.typeKey]) return null;
                                       const isSelected = selectedPoint?.data.log.id === p.log.id;

                                       return (
                                           <button 
                                              key={pIdx}
                                              onClick={(e) => handlePointClick(e, p)}
                                              className={`absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm transition-all duration-300 ${p.colorClass} ${isSelected ? 'w-4 h-4 ring-4 ring-offset-2 z-50' : 'w-2 h-2 hover:scale-150'}`}
                                              style={{ top: `${p.topPercent}%`, zIndex: isSelected ? 100 : p.zIndex }}
                                           />
                                       );
                                   })}
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>

             {/* INFO POPUP (Fixed Position Overlay) */}
             {selectedPoint && (
                 <div 
                    className="absolute z-50 animate-fade-in-up"
                    style={{ 
                        left: '50%', 
                        top: '40%', // Center in chart container
                        transform: 'translate(-50%, -50%)' 
                    }}
                 >
                     <div className="bg-white rounded-2xl shadow-2xl p-4 border border-gray-100 w-48 text-center relative overflow-hidden ring-1 ring-black/5">
                        {/* Decorative background shape */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${selectedPoint.data.colorClass.split(' ')[0]}`}></div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedPoint(null); }}
                            className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-3 h-3" />
                        </button>

                        <div className="mt-1 mb-2">
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full inline-block mb-1">
                                {new Date(selectedPoint.data.log.timestamp).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})}
                            </span>
                            <div className="text-2xl font-black text-gray-800 font-mono">
                                {new Date(selectedPoint.data.log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </div>
                        </div>

                        <div className="mb-3">
                            <div className="text-sm font-bold text-gray-700">{selectedPoint.data.typeLabel}</div>
                            <div className="text-xs text-gray-500">{selectedPoint.data.details}</div>
                        </div>

                        {selectedPoint.data.intervalDisplay && (
                            <div className="bg-indigo-50 rounded-lg p-2 text-indigo-600 flex items-center justify-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                <div>
                                    <div className="text-[9px] opacity-70 leading-none">相隔</div>
                                    <div className="text-xs font-bold leading-none">{selectedPoint.data.intervalDisplay}</div>
                                </div>
                            </div>
                        )}
                     </div>
                     {/* Triangle pointer (Optional, simplified for center positioning) */}
                 </div>
             )}
        </div>
    </div>
  );
};
