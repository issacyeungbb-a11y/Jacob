
import React from 'react';
import { BabyLog, LogType, FeedLog, DiaperLog, SleepLog, HealthLog, OtherLog, SummaryLog } from '../types';
import { Milk, Baby, Moon, Activity, Trash2, StickyNote, Sunrise, Sun, Sunset, MoonStar, Clock, AlertTriangle, Smile, Meh, Frown, ClipboardCheck, Star } from 'lucide-react';

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
      case LogType.SUMMARY: return <ClipboardCheck className="w-5 h-5 text-amber-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getQualityIcon = (quality?: string) => {
      switch(quality) {
          case 'GOOD': return <Smile className="w-4 h-4 text-emerald-500" />;
          case 'OK': return <Meh className="w-4 h-4 text-amber-500" />;
          case 'BAD': return <Frown className="w-4 h-4 text-red-500" />;
          default: return null;
      }
  };

  const getQualityText = (quality?: string) => {
      switch(quality) {
          case 'GOOD': return '安穩';
          case 'OK': return '普通';
          case 'BAD': return '哭鬧';
          default: return '';
      }
  };

  const getMoodIcon = (mood: string) => {
     switch(mood) {
        case 'HAPPY': return <Smile className="w-4 h-4 text-orange-500" />;
        case 'NORMAL': return <Meh className="w-4 h-4 text-orange-400" />;
        case 'FUSSY': return <Frown className="w-4 h-4 text-orange-600" />;
        default: return null;
     }
  };

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

    if (hour < 6) return { label: '凌晨', icon: <MoonStar className="w-3 h-3" />, bgColor: 'bg-indigo-50', textColor: 'text-indigo-400', borderColor: 'border-indigo-300' };
    if (hour < 12) return { label: '早上', icon: <Sunrise className="w-3 h-3" />, bgColor: 'bg-amber-50', textColor: 'text-amber-500', borderColor: 'border-amber-300' };
    if (hour < 18) return { label: '下午', icon: <Sun className="w-3 h-3" />, bgColor: 'bg-sky-50', textColor: 'text-sky-500', borderColor: 'border-sky-300' };
    return { label: '晚上', icon: <Sunset className="w-3 h-3" />, bgColor: 'bg-slate-50', textColor: 'text-slate-500', borderColor: 'border-slate-300' };
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
            const sLog = log as SleepLog;
            const durationMins = sLog.durationMinutes || 0;
            const endTime = new Date(log.timestamp);
            if (isNaN(endTime.getTime())) return "時間格式錯誤";
            const startTime = new Date(endTime.getTime() - durationMins * 60000);
            const hours = Math.floor(durationMins / 60);
            const mins = durationMins % 60;
            const durationStr = `${hours > 0 ? `${hours}小時 ` : ''}${mins}分鐘`;
            return (
                <div className="flex flex-col gap-1">
                    <span>{startTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {endTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} ({durationStr})</span>
                    {sLog.quality && (
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                             品質: {getQualityIcon(sLog.quality)} {getQualityText(sLog.quality)}
                        </span>
                    )}
                </div>
            );
        case LogType.HEALTH:
            const h = log as HealthLog;
            return [
            h.weightKg ? `${h.weightKg}kg` : '',
            h.heightCm ? `${h.heightCm}cm` : '',
            h.headCircumferenceCm ? `頭圍 ${h.headCircumferenceCm}cm` : ''
            ].filter(Boolean).join(', ') || '無數值';
        case LogType.OTHER:
            return (log as OtherLog).details || '無內容';
        case LogType.SUMMARY:
            const sumLog = log as SummaryLog;
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                     <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-xs">評分:</span>
                        <div className="flex text-amber-400">
                           {Array.from({length: sumLog.rating}).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                        </div>
                     </div>
                     <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-xs">夜醒:</span>
                        <span className="font-bold text-gray-700">{sumLog.nightWakings}次</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-xs">情緒:</span>
                        {getMoodIcon(sumLog.mood)}
                     </div>
                     <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-xs">估計:</span>
                        <span className="font-bold text-gray-700">{sumLog.approxSleepHours}小時</span>
                     </div>
                </div>
            );
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
        try { timeString = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch(e) {}
        
        // Special styling for Summary
        const isSummary = log.type === LogType.SUMMARY;

        return (
          <div 
            key={log.id} 
            className={`bg-white rounded-xl shadow-sm flex items-center justify-between animate-fade-in overflow-hidden border-l-[6px] ${isSummary ? 'border-amber-400 bg-amber-50/30' : timeStyle.borderColor}`}
          >
            <div className="flex items-center gap-3 p-4 w-full">
              {/* Icon Circle */}
              <div className={`p-2.5 rounded-full ${isSummary ? 'bg-amber-100' : timeStyle.bgColor} flex-shrink-0`}>
                {getIcon(log.type)}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                   {/* Time Badge (Skip for summary if redundant, or show '全日') */}
                   {!isSummary && (
                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${timeStyle.bgColor} ${timeStyle.textColor}`}>
                          {timeStyle.icon}
                          {timeStyle.label}
                       </span>
                   )}
                   {isSummary && (
                       <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">
                          每日總結
                       </span>
                   )}
                   
                   {/* Actual Time */}
                   <span className="font-bold text-gray-800 text-sm">
                     {timeString}
                   </span>
                   
                   {feedInterval && (
                       <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                         <Clock className="w-3 h-3 text-gray-400" />
                         相隔 {feedInterval}
                       </span>
                   )}
                </div>
                
                <div className="text-gray-600 text-sm whitespace-pre-wrap leading-tight">
                    {getDetails(log)}
                </div>
              </div>

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
