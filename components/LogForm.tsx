import React, { useState } from 'react';
import { LogType, FeedType, DiaperType, BabyLog } from '../types';
import { PlusCircle, Clock, CalendarDays } from 'lucide-react';

interface LogFormProps {
  onAddLog: (log: BabyLog) => void;
}

export const LogForm: React.FC<LogFormProps> = ({ onAddLog }) => {
  const [activeType, setActiveType] = useState<LogType>(LogType.FEED);
  
  // Form States
  const [amount, setAmount] = useState<number>(120);
  const [feedType, setFeedType] = useState<FeedType>(FeedType.FORMULA);
  const [diaperStatus, setDiaperStatus] = useState<DiaperType>(DiaperType.WET);
  const [sleepDuration, setSleepDuration] = useState<number>(60);
  const [weight, setWeight] = useState<number>(3.5);
  const [height, setHeight] = useState<number>(50);
  const [headCirc, setHeadCirc] = useState<number>(35);
  const [otherDetails, setOtherDetails] = useState<string>("");
  
  // Time helper
  const toLocalISO = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const [date, setDate] = useState<string>(toLocalISO(new Date()));

  // Quick Time Adjustments
  const setQuickTime = (minutesOffset: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutesOffset);
    setDate(toLocalISO(now));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseLog = {
      id: Date.now().toString(),
      timestamp: new Date(date).toISOString(),
    };

    let newLog: BabyLog;

    switch (activeType) {
      case LogType.FEED:
        newLog = { ...baseLog, type: LogType.FEED, amountMl: Number(amount), feedType } as any;
        break;
      case LogType.DIAPER:
        newLog = { ...baseLog, type: LogType.DIAPER, status: diaperStatus } as any;
        break;
      case LogType.SLEEP:
        newLog = { ...baseLog, type: LogType.SLEEP, durationMinutes: Number(sleepDuration) } as any;
        break;
      case LogType.HEALTH:
        newLog = { ...baseLog, type: LogType.HEALTH, weightKg: Number(weight), heightCm: Number(height), headCircumferenceCm: Number(headCirc) } as any;
        break;
      case LogType.OTHER:
        newLog = { ...baseLog, type: LogType.OTHER, details: otherDetails } as any;
        break;
      default:
        return;
    }

    onAddLog(newLog);
    // Reset date to now for next entry
    setDate(toLocalISO(new Date()));
    setOtherDetails(""); // Reset other field
  };

  const TabButton = ({ type, label }: { type: LogType, label: string }) => (
    <button
      type="button"
      onClick={() => setActiveType(type)}
      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 whitespace-nowrap px-2 ${
        activeType === type 
        ? 'bg-blue-600 text-white shadow-md transform scale-105' 
        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <PlusCircle className="w-6 h-6 text-blue-500" />
        新增記錄
      </h2>
      
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        <TabButton type={LogType.FEED} label="飲食" />
        <TabButton type={LogType.DIAPER} label="尿片" />
        <TabButton type={LogType.SLEEP} label="睡眠" />
        <TabButton type={LogType.HEALTH} label="健康" />
        <TabButton type={LogType.OTHER} label="其他" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              記錄時間
            </label>
            <span className="text-xs text-blue-500">可點選時間補填舊記錄</span>
          </div>
          
          {/* Quick Time Buttons */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            <button type="button" onClick={() => setQuickTime(0)} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100 whitespace-nowrap">現在</button>
            <button type="button" onClick={() => setQuickTime(-15)} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-full border border-gray-200 whitespace-nowrap">-15分</button>
            <button type="button" onClick={() => setQuickTime(-30)} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-full border border-gray-200 whitespace-nowrap">-30分</button>
            <button type="button" onClick={() => setQuickTime(-60)} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-full border border-gray-200 whitespace-nowrap">-1小時</button>
          </div>

          <div className="relative">
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-700"
              required
            />
          </div>
        </div>

        {activeType === LogType.FEED && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
              <div className="flex gap-2">
                {(Object.values(FeedType) as FeedType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFeedType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${feedType === t ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-50 border border-gray-200 text-gray-600'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">奶量 (ml)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="120"
              />
            </div>
          </>
        )}

        {activeType === LogType.DIAPER && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
            <div className="flex gap-2">
              {(Object.values(DiaperType) as DiaperType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDiaperStatus(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${diaperStatus === t ? 'bg-amber-100 text-amber-700 border-2 border-amber-500' : 'bg-gray-50 border border-gray-200 text-gray-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeType === LogType.SLEEP && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">時長 (分鐘)</label>
            <input
              type="number"
              value={sleepDuration}
              onChange={(e) => setSleepDuration(Number(e.target.value))}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        )}

        {activeType === LogType.HEALTH && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">體重 (kg)</label>
              <input
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full p-2 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">身高 (cm)</label>
              <input
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full p-2 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">頭圍 (cm)</label>
              <input
                type="number"
                step="0.1"
                value={headCirc}
                onChange={(e) => setHeadCirc(Number(e.target.value))}
                className="w-full p-2 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        )}

        {activeType === LogType.OTHER && (
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">事項內容</label>
             <textarea
               rows={3}
               value={otherDetails}
               onChange={(e) => setOtherDetails(e.target.value)}
               placeholder="例如：洗澡、肚仔痛、打針、趴趴時間..."
               className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-pink-500 outline-none text-gray-700"
               required
             />
          </div>
        )}

        <button
          type="submit"
          className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
        >
          儲存記錄
        </button>
      </form>
    </div>
  );
};