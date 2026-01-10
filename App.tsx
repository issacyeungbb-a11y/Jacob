
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog } from './types';
import { 
  subscribeToLogs, 
  subscribeToSleepStatus, 
  subscribeToProfilePhoto, // New Import
  addLogToCloud, 
  deleteLogFromCloud, 
  exportLogsToJSON, 
  setSleepStatus, 
  clearSleepStatus,
  uploadProfilePhotoToCloud, // New Import
  deleteProfilePhotoFromCloud // New Import
} from './services/storageService';
import { isConfigured } from './services/firebase';
import { generateBabyInsights } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { LogForm } from './components/LogForm';
import { LogList } from './components/LogList';
import { TrendsChart } from './components/TrendsChart';
import { HealthChart } from './components/HealthChart';
import { 
  Sparkles, 
  Download, 
  Baby, 
  CloudLightning, 
  Settings, 
  ExternalLink, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard,
  History,
  BarChart2,
  BrainCircuit,
  Plus,
  Loader2,
  WifiOff,
  Image as ImageIcon,
  RefreshCw,
  Camera,
  X,
  Edit3
} from 'lucide-react';
import { BABY_NAME, BIRTH_DATE } from './constants';

type AppView = 'HOME' | 'HISTORY' | 'TRENDS' | 'AI';

const App: React.FC = () => {
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
           <div className="flex justify-center mb-6">
             <div className="bg-red-100 p-4 rounded-full">
               <Settings className="w-10 h-10 text-red-500" />
             </div>
           </div>
           <h1 className="text-2xl font-black text-gray-800 mb-4">尚未連結資料庫</h1>
           <p className="text-gray-600 mb-6 leading-relaxed">
             Jacob 的成長日記需要 Firebase 來同步您的資料。
           </p>
           <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-left text-sm mb-6">
              <p className="font-bold mb-2">請執行以下操作：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>前往 Firebase Console</li>
                <li>建立專案並獲取 Config</li>
                <li>更新 <code className="bg-gray-200 px-1 rounded">services/firebase.ts</code></li>
              </ol>
           </div>
           <a href="https://console.firebase.google.com/" target="_blank" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">
             開啟 Firebase Console <ExternalLink className="w-4 h-4"/>
           </a>
        </div>
      </div>
    );
  }

  const getLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
  };

  const [activeView, setActiveView] = useState<AppView>('HOME');
  const [logs, setLogs] = useState<BabyLog[]>([]);
  const [isSleeping, setIsSleeping] = useState(false);
  const [sleepStartTime, setSleepStartTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const [insights, setInsights] = useState<string>("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Image handling state
  const [imgError, setImgError] = useState(false);
  const [imgTimestamp, setImgTimestamp] = useState(Date.now()); 
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 設置超時檢查，若 Firebase 太久沒反應則停止 loading
    const timeout = setTimeout(() => {
        if (isLoading) setIsLoading(false);
    }, 5000);

    // 1. 訂閱記錄
    const unsubscribeLogs = subscribeToLogs(
        (updatedLogs) => {
            const validLogs = updatedLogs.filter(l => l.timestamp && !isNaN(new Date(l.timestamp).getTime()));
            setLogs(validLogs);
            setIsLoading(false);
            setError(null);
        },
        (err) => {
            console.error(err);
            setError("無法連結資料庫，請檢查權限或網絡。");
            setIsLoading(false);
        }
    );

    // 2. 訂閱睡眠狀態
    const unsubscribeSleep = subscribeToSleepStatus((startTime) => {
      setIsSleeping(!!startTime);
      setSleepStartTime(startTime);
    });

    // 3. 訂閱封面照片 (雲端同步)
    const unsubscribePhoto = subscribeToProfilePhoto((photoBase64) => {
      setCustomImage(photoBase64);
      setImgError(false); // 重設錯誤狀態，因為可能從雲端載入了有效圖片
    });

    return () => {
      unsubscribeLogs();
      unsubscribeSleep();
      unsubscribePhoto();
      clearTimeout(timeout);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      try {
        const logDate = new Date(l.timestamp);
        const offset = logDate.getTimezoneOffset() * 60000;
        const localLogDate = new Date(logDate.getTime() - offset).toISOString().split('T')[0];
        return localLogDate === selectedDate;
      } catch (e) {
        return false;
      }
    });
  }, [logs, selectedDate]);

  const lastFeedTime = useMemo(() => {
    const feeds = logs.filter(l => l.type === LogType.FEED).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return feeds.length > 0 ? feeds[0].timestamp : null;
  }, [logs]);

  const feedIntervals = useMemo(() => {
    const intervals: Record<string, string> = {};
    const feeds = logs.filter(l => l.type === LogType.FEED).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    for (let i = 1; i < feeds.length; i++) {
        const current = new Date(feeds[i].timestamp).getTime();
        const prev = new Date(feeds[i-1].timestamp).getTime();
        if (!isNaN(current) && !isNaN(prev)) {
            const diffMs = current - prev;
            const hrs = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            intervals[feeds[i].id] = `${hrs}h ${mins}m`;
        }
    }
    return intervals;
  }, [logs]);

  // Calculate Days Since Birth
  const daysSinceBirth = useMemo(() => {
    const birth = new Date(BIRTH_DATE);
    const now = new Date();
    const diffTime = now.getTime() - birth.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return days;
  }, []);

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    const result = await generateBabyInsights(logs);
    setInsights(result);
    setIsGeneratingInsights(false);
  };

  const handleRetryImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgError(false);
    setImgTimestamp(Date.now()); 
  };

  // 圖片壓縮功能 (調整為更小的尺寸以適應 Firestore 限制)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Firestore 單文件限制 1MB。
                // 將最大寬度設為 800px，品質 0.6，確保 Base64 字串夠小。
                const maxWidth = 800;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // 輸出為 JPEG, 品質 0.6
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImg(true);

    try {
        const compressedBase64 = await compressImage(file);
        
        try {
            // 上傳到雲端 Firestore
            await uploadProfilePhotoToCloud(compressedBase64);
            // 狀態更新會由 subscribeToProfilePhoto 自動處理
        } catch (storageErr) {
            console.error(storageErr);
            alert("上傳失敗：請檢查網路連線。");
        }
    } catch (err) {
        console.error("Compression error:", err);
        alert("圖片處理失敗，請重試。");
    } finally {
        setIsProcessingImg(false);
        // Clear input so same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleRemovePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("確定要移除自訂照片，恢復預設嗎？這會影響所有裝置。")) {
      try {
        await deleteProfilePhotoFromCloud();
        setCustomImage(null);
        setImgError(false);
        setImgTimestamp(Date.now());
      } catch (e) {
        alert("移除失敗，請稍後再試");
      }
    }
  };

  const NavButton = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all ${activeView === view ? 'text-blue-600' : 'text-gray-400'}`}
    >
      <Icon className={`w-6 h-6 ${activeView === view ? 'scale-110' : ''}`} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );

  // Determine which image source to show
  const displayImageSrc = useMemo(() => {
    if (customImage) return customImage;
    if (imgError) return 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=2070&auto=format&fit=crop';
    return `/jacob.jpg?t=${imgTimestamp}`;
  }, [customImage, imgError, imgTimestamp]);

  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-gray-500 font-medium animate-pulse">正在同步 Jacob 的資料...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 pt-6 pb-4 shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-100">
               <Baby className="w-6 h-6 text-white" />
             </div>
             <div>
               <h1 className="text-xl font-black text-gray-800 tracking-tight">{BABY_NAME} 的日記</h1>
               <div className="flex items-center gap-2">
                 {error ? (
                     <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> {error}
                     </span>
                 ) : (
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
                        <CloudLightning className="w-3 h-3" /> 即時同步中
                    </p>
                 )}
               </div>
             </div>
          </div>
          <button 
            onClick={() => exportLogsToJSON(logs)}
            className="p-2 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {activeView === 'HOME' && (
          <>
            {/* Hero Image & Day Counter */}
            <div className="relative w-full h-64 rounded-3xl overflow-hidden shadow-xl group bg-gray-900">
              {/* Main Image */}
              <img 
                key={customImage ? 'custom' : imgTimestamp} 
                src={displayImageSrc}
                alt="Baby Jacob" 
                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${(!customImage && imgError) || isProcessingImg ? 'opacity-50' : 'opacity-100'}`}
                onError={(e) => {
                  console.warn("Image load failed");
                  setImgError(true);
                }}
              />
              
              {/* Processing Overlay */}
              {isProcessingImg && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-40 backdrop-blur-sm">
                      <Loader2 className="w-10 h-10 text-white animate-spin mb-2" />
                      <p className="text-white font-bold text-sm">正在同步到雲端...</p>
                  </div>
              )}

              {/* Image Control Buttons */}
              <div className="absolute top-4 right-4 flex gap-2 z-30">
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*"
                   onChange={handlePhotoUpload}
                 />
                 
                 {/* Only show upload button when not processing */}
                 {!isProcessingImg && (
                    <>
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-black/30 backdrop-blur-md hover:bg-black/50 text-white rounded-full transition-all shadow-sm border border-white/20"
                        >
                            <Camera className="w-4 h-4" />
                            <span className="text-xs font-bold">{customImage ? '更換' : '上傳'}</span>
                        </button>
                        
                        {customImage && (
                        <button 
                            onClick={handleRemovePhoto}
                            className="p-1.5 bg-red-500/80 backdrop-blur-md hover:bg-red-600 text-white rounded-full transition-all shadow-sm"
                            title="恢復預設"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        )}
                    </>
                 )}
              </div>

              {/* Fallback Warning (Only if strictly needed) */}
              {!customImage && imgError && !isProcessingImg && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-20 pointer-events-none">
                    <div className="bg-white/90 p-3 rounded-xl flex flex-col items-center gap-2 shadow-lg max-w-[80%] text-center backdrop-blur-sm pointer-events-auto">
                        <ImageIcon className="w-6 h-6 text-gray-500" />
                        <p className="text-xs font-bold text-gray-700">找不到預設照片</p>
                        <button 
                            onClick={handleRetryImage}
                            className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" /> 重試
                        </button>
                    </div>
                 </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 pointer-events-none">
                 <p className="text-white/90 text-sm font-bold mb-1 tracking-wide">來到地球的</p>
                 <h2 className="text-white text-5xl font-black tracking-tighter drop-shadow-sm">
                    第 {Math.abs(daysSinceBirth)} 天
                    {daysSinceBirth < 0 && <span className="text-sm font-medium opacity-70 ml-2">(倒數中)</span>}
                 </h2>
              </div>
            </div>

            <Dashboard logs={logs} isSleeping={isSleeping} sleepStartTime={sleepStartTime} />
            <LogForm 
              onAddLog={addLogToCloud} 
              isSleeping={isSleeping} 
              sleepStartTime={sleepStartTime}
              onStartSleep={setSleepStatus}
              onEndSleep={async (log) => {
                await addLogToCloud(log);
                await clearSleepStatus();
              }}
              lastFeedTime={lastFeedTime}
            />
          </>
        )}

        {activeView === 'HISTORY' && (
          <div className="space-y-4">
             <div className="bg-white p-4 rounded-3xl shadow-sm flex items-center justify-between">
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(getLocalDateString(d));
                }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 font-bold text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {selectedDate === getLocalDateString(new Date()) ? '今日' : selectedDate}
                </div>
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(getLocalDateString(d));
                }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
             </div>
             <LogList logs={filteredLogs} onDeleteLog={deleteLogFromCloud} feedIntervals={feedIntervals} />
          </div>
        )}

        {activeView === 'TRENDS' && (
          <div className="space-y-6">
            <TrendsChart logs={logs} />
            <HealthChart logs={logs} />
          </div>
        )}

        {activeView === 'AI' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BrainCircuit className="w-24 h-24" />
               </div>
               <div className="relative z-10">
                 <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
                   <Sparkles className="w-6 h-6 text-amber-300" />
                   AI 成長分析
                 </h2>
                 <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                   讓 Gemini 分析 Jacob 最近 7 天的數據，提供個人化的成長建議。
                 </p>
                 <button 
                   onClick={handleGenerateInsights}
                   disabled={isGeneratingInsights}
                   className="w-full py-4 bg-white text-indigo-700 font-black rounded-2xl shadow-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {isGeneratingInsights ? (
                     <>
                       <div className="w-5 h-5 border-4 border-indigo-700 border-t-transparent rounded-full animate-spin"></div>
                       分析中...
                     </>
                   ) : (
                     <>
                       <BrainCircuit className="w-5 h-5" />
                       產生分析報告
                     </>
                   )}
                 </button>
               </div>
            </div>

            {insights && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-100 animate-fade-in">
                 <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold">
                    <History className="w-5 h-5" />
                    分析結果
                 </div>
                 <div className="prose prose-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {insights}
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-4 py-2 flex justify-between items-center z-50">
        <NavButton view="HOME" icon={LayoutDashboard} label="儀表板" />
        <NavButton view="HISTORY" icon={History} label="紀錄" />
        <div className="flex flex-col items-center -mt-8">
           <button 
             onClick={() => setActiveView('HOME')}
             className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-200 border-4 border-white transform hover:scale-105 active:scale-95 transition-all"
           >
             <Plus className="w-8 h-8" />
           </button>
        </div>
        <NavButton view="TRENDS" icon={BarChart2} label="趨勢" />
        <NavButton view="AI" icon={BrainCircuit} label="AI 分析" />
      </nav>
    </div>
  );
};

export default App;
