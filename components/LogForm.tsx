
import React, { useState, useEffect, useMemo } from 'react';
import { LogType, FeedType, DiaperType, BabyLog, HealthLog } from '../types';
import { PlusCircle, CalendarDays, Moon, ArrowRight, Play, Square, History, Weight, Ruler, Activity, Clock } from 'lucide-react';

interface LogFormProps {
  onAddLog: (log: BabyLog) => void;
  isSleeping: boolean;
  sleepStartTime: string | null;
  onStartSleep: (startTime: string) => void;
  onEndSleep: (log: BabyLog) => void;
  lastFeedTime?: string | null;
}

type HealthSubType = 'WEIGHT' | 'HEIGHT' | 'HEAD';

export const LogForm: React.FC<LogFormProps> = ({ onAddLog, isSleeping, sleepStartTime, onStartSleep, onEndSleep, lastFeedTime }) => {
  const [activeType, setActiveType] = useState<LogType>(LogType.FEED);
  const [mode, setMode] = useState<'LIVE' | 'MANUAL'>('LIVE');
  
  const toLocalISO = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const [amount, setAmount] = useState<number>(120);
  const [feedType, setFeedType] = useState<FeedType>(FeedType.FORMULA);
  const [diaperStatus, setDiaperStatus] = useState<DiaperType>(DiaperType.WET);
  const [startSleepInput, setStartSleepInput] = useState<string>(toLocalISO(new Date()));
  const [endSleepInput, setEndSleepInput] = useState<string>(toLocalISO(new Date()));
  const [manualSleepStart, setManualSleepStart] = useState<string>(toLocalISO(new Date(Date.now() - 60 * 60 * 1000)));
  const [manualSleepEnd, setManualSleepEnd] = useState<string>(toLocalISO(new Date()));
  const [healthSubType, setHealthSubType] = useState<HealthSubType>('WEIGHT');
  const [healthValue, setHealthValue] = useState<string>("");
  const [otherDetails, setOtherDetails] = useState<string>("");
  const [date, setDate] = useState<string>(toLocalISO(new Date()));

  const timeSinceLastFeed = useMemo(() => {
    if (activeType !== LogType.FEED || !lastFeedTime || !date) return null;
    const currentSelectedTime = new Date(date).getTime();
    const lastFeedTimestamp = new Date(lastFeedTime).getTime();
    const diffMs = currentSelectedTime - lastFeedTimestamp;
    if (diffMs <= 0) return null;
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}小時 ${mins}分`;
  }, [date, lastFeedTime, activeType]);

  useEffect(() => {
    const timer = setInterval(() => {
        if (isSleeping) {
            setEndSleepInput(toLocalISO(new Date()));
        } else {
            setStartSleepInput(toLocalISO(new Date()));
        }
    }, 60000);
    return () => clearInterval(timer);
  }, [isSleeping]);

  const setQuickTime = (minutesOffset: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutesOffset);
    setDate(toLocalISO(now));
  };
  
  const handleStartSleeping = () => {
    const start = new Date(startSleepInput).toISOString();
    onStartSleep(start);
  };

  const handleWakeUp = () => {
    if (!sleepStartTime) return;
    const start = new Date(sleepStartTime).getTime();
    const end = new Date(endSleepInput).getTime();
    const duration = Math.floor((end - start) / (1000 * 60));
    if (duration <= 0) {
        alert("起床時間必須晚於入睡時間");
        return;
    }
    const newLog: BabyLog = {
        id: Date.now().toString(),
        timestamp: new Date(endSleepInput).toISOString(),
        type: LogType.SLEEP,
        durationMinutes: duration
    };
    onEndSleep(newLog);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newLog: BabyLog;
    const id = Date.now().toString();

    if (activeType === LogType.SLEEP && mode === 'MANUAL') {
        const start = new Date(manualSleepStart).getTime();
        const end = new Date(manualSleepEnd).getTime();
        const duration = Math.floor((end - start) / (1000 * 60));
        if (duration <= 0) {
            alert("結束時間必須晚於開始時間");
            return;
        }
        newLog = {
            id,
            timestamp: new Date(manualSleepEnd).toISOString(),
            type: LogType.SLEEP,
            durationMinutes: duration
        };
    } else {
        const baseLog = {
            id,
            timestamp: new Date(date).toISOString(),
        };

        switch (activeType) {
            case LogType.FEED:
                newLog = { ...baseLog, type: LogType.FEED, amountMl: Number(amount), feedType } as any;
                break;
            case LogType.DIAPER:
                newLog = { ...baseLog, type: LogType.DIAPER, status: diaperStatus } as any;
                break;
            case LogType.HEALTH:
                const val = parseFloat(healthValue);
                if (isNaN(val) || val <= 0) {
                    alert("請輸入有效的數值");
                    return;
                }
                // 重要：動態建立物件，避免包含 undefined 導致 Firebase 報錯
                const hLog: any = { 
                    ...baseLog, 
                    type: LogType.HEALTH 
                };
                if (healthSubType === 'WEIGHT') hLog.weightKg = val;
                else if (healthSubType === 'HEIGHT') hLog.heightCm = val;
                else if (healthSubType === 'HEAD') hLog.headCircumferenceCm = val;
                newLog = hLog as HealthLog;
                break;
            case LogType.OTHER:
                newLog = { ...baseLog, type: LogType.OTHER, details: otherDetails } as any;
                break;
            default:
                return;
        }
    }

    onAddLog(newLog);
    
    // 重設欄位
    setHealthValue("");
    setOtherDetails("");
    const now = new Date();
    setDate(toLocalISO(now));
  };

  const TabButton = ({ type, label }: { type: LogType, label: string }) => (
    <button
      type="button"
      onClick={() => { setActiveType(type); setMode('LIVE'); }}
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

      {activeType === LogType.SLEEP ? (
          <div>
             <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                <button 
                    onClick={() => setMode('LIVE')}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${mode === 'LIVE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                >
                    即時開關
                </button>
                <button 
                    onClick={() => setMode('MANUAL')}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${mode === 'MANUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                >
                    <History className="w-3 h-3" />
                    手動補登
                </button>
             </div>

             {mode === 'LIVE' && (
                 <div className="bg-indigo-50 p-6 rounded-2xl text-center border border-indigo-100">
                    {isSleeping ? (
                        <>
                           <div className="mb-4 text-indigo-800 font-bold">Jacob 正在睡覺...</div>
                           <label className="block text-xs text-indigo-400 mb-1 text-left">起床時間</label>
                           <input
                                type="datetime-local"
                                value={endSleepInput}
                                onChange={(e) => setEndSleepInput(e.target.value)}
                                className="w-full p-3 rounded-xl bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                            />
                           <button 
                              onClick={handleWakeUp}
                              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-lg"
                           >
                              <Square className="w-5 h-5 fill-current" />
                              起床 (停止計時)
                           </button>
                        </>
                    ) : (
                        <>
                           <label className="block text-xs text-indigo-400 mb-1 text-left">入睡時間</label>
                           <input
                                type="datetime-local"
                                value={startSleepInput}
                                onChange={(e) => setStartSleepInput(e.target.value)}
                                className="w-full p-3 rounded-xl bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                            />
                           <button 
                              onClick={handleStartSleeping}
                              className="w-full py-4 bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-lg"
                           >
                              <Play className="w-5 h-5 fill-current" />
                              開始睡覺
                           </button>
                        </>
                    )}
                 </div>
             )}

             {mode === 'MANUAL' && (
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Moon className="w-4 h-4 text-indigo-400" /> 入睡時間
                            </label>
                            <input
                                type="datetime-local"
                                value={manualSleepStart}
                                onChange={(e) => setManualSleepStart(e.target.value)}
                                className="w-full p-3 rounded-xl bg-indigo-50 border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="flex justify-center -my-2">
                            <ArrowRight className="w-5 h-5 text-indigo-300 rotate-90" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Moon className="w-4 h-4 text-indigo-400" /> 醒來時間
                            </label>
                            <input
                                type="datetime-local"
                                value={manualSleepEnd}
                                onChange={(e) => setManualSleepEnd(e.target.value)}
                                className="w-full p-3 rounded-xl bg-indigo-50 border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                        補登記錄
                    </button>
                 </form>
             )}
          </div>
      ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="flex justify-between items-end mb-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    記錄時間
                    </label>
                    
                    {activeType === LogType.FEED && timeSinceLastFeed && (
                       <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md animate-fade-in">
                          <Clock className="w-3 h-3 text-blue-400" />
                          <span className="text-[10px] text-blue-500 font-bold">
                             距離上次: {timeSinceLastFeed}
                          </span>
                       </div>
                    )}
                </div>
                
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

            {activeType === LogType.HEALTH && (
            <div>
              <div className="flex gap-2 mb-4">
                <button
                   type="button"
                   onClick={() => setHealthSubType('WEIGHT')}
                   className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${healthSubType === 'WEIGHT' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 shadow-sm' : 'bg-gray-50 border border-gray-200 text-gray-500'}`}
                >
                   <Weight className="w-5 h-5" />
                   <span className="text-xs font-bold">體重</span>
                </button>
                <button
                   type="button"
                   onClick={() => setHealthSubType('HEIGHT')}
                   className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${healthSubType === 'HEIGHT' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 shadow-sm' : 'bg-gray-50 border border-gray-200 text-gray-500'}`}
                >
                   <Ruler className="w-5 h-5" />
                   <span className="text-xs font-bold">身高</span>
                </button>
                <button
                   type="button"
                   onClick={() => setHealthSubType('HEAD')}
                   className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${healthSubType === 'HEAD' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 shadow-sm' : 'bg-gray-50 border border-gray-200 text-gray-500'}`}
                >
                   <Activity className="w-5 h-5" />
                   <span className="text-xs font-bold">頭圍</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                   {healthSubType === 'WEIGHT' ? '重量 (kg)' : '長度 (cm)'}
                </label>
                <input
                    type="number"
                    step="0.01"
                    value={healthValue}
                    onChange={(e) => setHealthValue(e.target.value)}
                    placeholder={healthSubType === 'WEIGHT' ? '3.5' : '50.0'}
                    className="w-full p-4 text-xl font-bold text-center rounded-xl bg-emerald-50 border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-800"
                    autoFocus
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
      )}
    </div>
  );
};
