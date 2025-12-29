import React from 'react';
import { BabyLog, LogType, FeedLog, DiaperLog, SleepLog, HealthLog, OtherLog } from '../types';
import { Milk, Baby, Moon, Activity, Trash2, StickyNote } from 'lucide-react';

interface LogListProps {
  logs: BabyLog[];
  onDeleteLog: (id: string) => void;
}

export const LogList: React.FC<LogListProps> = ({ logs, onDeleteLog }) => {
  // Sort by date desc
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getIcon = (type: LogType) => {
    switch (type) {
      case LogType.FEED: return <Milk className="w-5 h-5 text-blue-500" />;
      case LogType.DIAPER: return <Baby className="w-5 h-5 text-amber-500" />;
      case LogType.SLEEP: return <Moon className="w-5 h-5 text-indigo-500" />;
      case LogType.HEALTH: return <Activity className="w-5 h-5 text-emerald-500" />;
      case LogType.OTHER: return <StickyNote className="w-5 h-5 text-pink-500" />;
    }
  };

  const getDetails = (log: BabyLog) => {
    switch (log.type) {
      case LogType.FEED:
        const f = log as FeedLog;
        return `${f.amountMl}ml - ${f.feedType}`;
      case LogType.DIAPER:
        return (log as DiaperLog).status;
      case LogType.SLEEP:
        const hours = Math.floor((log as SleepLog).durationMinutes / 60);
        const mins = (log as SleepLog).durationMinutes % 60;
        return `${hours > 0 ? `${hours}小時 ` : ''}${mins}分鐘`;
      case LogType.HEALTH:
        const h = log as HealthLog;
        return [
           h.weightKg ? `${h.weightKg}kg` : '',
           h.heightCm ? `${h.heightCm}cm` : ''
        ].filter(Boolean).join(', ');
      case LogType.OTHER:
        return (log as OtherLog).details;
      default: return '';
    }
  };

  return (
    <div className="space-y-3">
      {sortedLogs.map((log) => (
        <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-gray-50`}>
              {getIcon(log.type)}
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 <span className="text-gray-400 font-normal text-xs ml-2">
                   {new Date(log.timestamp).toLocaleDateString()}
                 </span>
              </p>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{getDetails(log)}</p>
            </div>
          </div>
          <button 
            onClick={() => onDeleteLog(log.id)}
            className="p-2 text-gray-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      {sortedLogs.length === 0 && (
        <div className="text-center text-gray-400 py-8 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-sm">這一天沒有記錄。</p>
        </div>
      )}
    </div>
  );
};