
import React from 'react';
import { BabyLog, LogType, FeedLog, DiaperLog, SleepLog, HealthLog, OtherLog } from '../types';
import { Milk, Baby, Moon, Activity, Trash2, StickyNote, Sunrise, Sun, Sunset, MoonStar, Clock, AlertTriangle } from 'lucide-react';

interface LogListProps {
  logs: BabyLog[];
  onDeleteLog: (id: string) => void;
  feedIntervals?: Record<string, string>;
}

export const LogList: React.FC<LogListProps> = ({ logs, onDeleteLog, feedIntervals }) => {
  // Sort by date desc
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getIcon = (type: LogType) => {
    switch (type) {
      case LogType.FEED: return <Milk className="w-5 h-5 text-blue-500" />;
      case LogType.DIAPER: return <Baby className="w-5 h-5 text-amber-500" />;
      case LogType.SLEEP: return <Moon className="w-5 h-5 text-indigo-500" />;
      case LogType.HEALTH: return <Activity className="w-5 h-5 text-emerald-500" />;
      case LogType.OTHER: return <StickyNote className="w-5 h-5 text-pink-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Helper to determine time period styling
  const getTimePeriodStyle = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return {
            label: '錯誤',
            icon: <AlertTriangle className="w-3 h-3" />,
            bgColor: 'bg-red-50',
            textColor: 'text-red-500',
            borderColor: 'border-red-300'
        };
    }

    const hour = date.getHours();

    // 00:00 - 05:59: 凌晨 (Late Night)
    if (hour < 6) {
      return {
        label: '凌晨',
        icon: <MoonStar className="w-3 h-3" />,
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-400',
        borderColor: 'border-indigo-300'
      };
    }
    // 06:00 - 11:59: 早上 (Morning)
    if (hour < 12) {
      return {
        label: '早上',
        icon: <Sunrise className="w-3 h-3" />,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-500',
        borderColor: 'border-amber-300'
      };
    }
    // 12:00 - 17:59: 下午 (Afternoon)
    if (hour < 18) {
      return {
        label: '下午',
        icon: <Sun className="w-3 h-3" />,
        bgColor: 'bg-sky-50',
        textColor: 'text-sky-500',
        borderColor: 'border-sky-300'
      };
    }
    // 18:00 - 23:59: 晚上 (Evening)
    return {
      label: '晚上',
      icon: <Sunset className="w-3 h-3" />,
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-500',
      borderColor: 'border-slate-300'
    };
  };

  const getDetails = (log: BabyLog) => {
    try {
        switch (log.type) {
        case LogType.FEED:
            const f = log as FeedLog;
            return `${f.amountMl || 0}ml - ${f.feedType || '未知'}`;
        case LogType.DIAPER:
            return (log as DiaperLog).status || '未知狀態';
        case LogType.SLEEP:
            // Calculate start time based on end time (timestamp) and duration
            const durationMins = (log as SleepLog).durationMinutes || 0;
            const endTime = new Date(log.timestamp);
            
            if (isNaN(endTime.getTime())) return "時間格式錯誤";

            const startTime = new Date(endTime.getTime() - durationMins * 60000);
            
            const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const hours = Math.floor(durationMins / 60);
            const mins = durationMins % 60;
            const durationStr = `${hours > 0 ? `${hours}小時 ` : ''}${mins}分鐘`;
            
            return `${formatTime(startTime)} - ${formatTime(endTime)}\n(${durationStr})`;
        case LogType.HEALTH:
            const h = log as HealthLog;
            return [
            h.weightKg ? `${h.weightKg}kg` : '',
            h.heightCm ? `${h.heightCm}cm` : '',
            h.headCircumferenceCm ? `頭圍 ${h.headCircumferenceCm}cm` : ''
            ].filter(Boolean).join(', ') || '無數值';
        case LogType.OTHER:
            return (log as OtherLog).details || '無內容';
        default: return '';
        }
    } catch (e) {
        return '資料格式錯誤';
    }
  };

  return (
    <div className="space-y-3">
      {sortedLogs.map((log) => {
        const timeStyle = getTimePeriodStyle(log.timestamp);
        const feedInterval = (log.type === LogType.FEED && feedIntervals) ? feedIntervals[log.id] : null;
        
        let timeString = "--:--";
        try {
            timeString = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch(e) { /* ignore */ }

        return (
          <div 
            key={log.id} 
            className={`bg-white rounded-xl shadow-sm flex items-center justify-between animate-fade-in overflow-hidden border-l-[6px] ${timeStyle.borderColor}`}
          >
            <div className="flex items-center gap-3 p-4 w-full">
              {/* Icon Circle */}
              <div className={`p-2.5 rounded-full ${timeStyle.bgColor} flex-shrink-0`}>
                {getIcon(log.type)}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                   {/* Time Badge */}
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${timeStyle.bgColor} ${timeStyle.textColor}`}>
                      {timeStyle.icon}
                      {timeStyle.label}
                   </span>
                   {/* Actual Time */}
                   <span className="font-bold text-gray-800 text-sm">
                     {timeString}
                   </span>
                   
                   {/* Feed Interval Display */}
                   {feedInterval && (
                       <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                         <Clock className="w-3 h-3 text-gray-400" />
                         相隔 {feedInterval}
                       </span>
                   )}
                </div>
                
                <p className="text-gray-600 text-sm whitespace-pre-wrap leading-tight truncate">
                    {getDetails(log)}
                </p>
              </div>

              {/* Delete Button */}
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLog(log.id);
                }}
                className="p-2 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
      
      {sortedLogs.length === 0 && (
        <div className="text-center text-gray-400 py-8 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-sm">這一天沒有記錄。</p>
        </div>
      )}
    </div>
  );
};
