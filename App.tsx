import React, { useState, useEffect } from 'react';
import { BabyLog } from './types';
import { subscribeToLogs, addLogToCloud, deleteLogFromCloud, exportLogsToJSON } from './services/storageService';
import { isConfigured } from './services/firebase'; // Import configuration check
import { generateBabyInsights } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { LogForm } from './components/LogForm';
import { LogList } from './components/LogList';
import { Sparkles, Download, Baby, CloudLightning, Settings, ExternalLink } from 'lucide-react';
import { BABY_NAME, BIRTH_DATE } from './constants';

const App: React.FC = () => {
  // 1. 檢查 Firebase 是否已設定，如果沒設定，顯示教學畫面
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
           <div className="flex justify-center mb-6">
             <div className="bg-red-100 p-4 rounded-full">
               <Settings className="w-10 h-10 text-red-500" />
             </div>
           </div>
           <h1 className="text-2xl font-black text-gray-800 mb-4 text-center">尚未連結資料庫</h1>
           <p className="text-gray-600 mb-6 text-center leading-relaxed">
             為了啟用同步功能，您需要連結 Firebase 資料庫。請按照以下步驟操作：
           </p>
           
           <ol className="space-y-4 text-sm text-gray-700 bg-gray-50 p-5 rounded-xl border border-gray-200 mb-6">
             <li className="flex gap-2">
               <span className="font-bold text-blue-600">1.</span>
               <span>前往 <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-600 underline flex items-center gap-1 inline-flex">Firebase Console <ExternalLink className="w-3 h-3"/></a></span>
             </li>
             <li className="flex gap-2">
               <span className="font-bold text-blue-600">2.</span>
               <span>建立新專案，接著建立 <b>Web App</b>。</span>
             </li>
             <li className="flex gap-2">
               <span className="font-bold text-blue-600">3.</span>
               <span>複製 <b>Config</b> 程式碼片段。</span>
             </li>
             <li className="flex gap-2">
               <span className="font-bold text-blue-600">4.</span>
               <span>開啟程式碼中的 <code>services/firebase.ts</code> 檔案，貼上設定。</span>
             </li>
           </ol>
           
           <div className="text-center text-xs text-gray-400">
             完成後，請重新整理此頁面。
           </div>
        </div>
      </div>
    );
  }

  const [logs, setLogs] = useState<BabyLog[]>([]);
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  // 啟動時訂閱雲端資料
  useEffect(() => {
    // 當雲端資料有變動，這裡會自動執行，更新畫面
    const unsubscribe = subscribeToLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    // 組件卸載時取消訂閱
    return () => unsubscribe();
  }, []);

  // 新增時直接傳到雲端
  const handleAddLog = (newLog: BabyLog) => {
    addLogToCloud(newLog);
  };

  // 刪除時直接通知雲端
  const handleDeleteLog = (id: string) => {
    if (confirm("確定刪除這條記錄嗎？")) {
      deleteLogFromCloud(id);
    }
  };

  const handleGetInsight = async () => {
    if (logs.length === 0) return;
    setLoadingInsight(true);
    const result = await generateBabyInsights(logs);
    setInsight(result);
    setLoadingInsight(false);
  };

  // Calculate Age
  const birth = new Date(BIRTH_DATE);
  const now = new Date();
  const birthDay = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = currentDay.getTime() - birthDay.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

  const todayStr = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });

  return (
    <div className="min-h-screen pb-20 max-w-md mx-auto bg-gray-50 shadow-2xl overflow-hidden min-w-[320px]">
      {/* Header */}
      <header className="bg-white px-6 pt-8 pb-8 rounded-b-[2.5rem] shadow-sm mb-6">
        <div className="flex flex-col items-center mb-6">
          <p className="text-gray-500 font-bold text-sm tracking-wide mb-1">{todayStr}</p>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight mb-3">{BABY_NAME}</h1>
          
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full">
            <Baby className="w-4 h-4 text-blue-500" />
            <span className="text-blue-600 font-bold text-sm">
              出生第 {diffDays} 天
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
             <CloudLightning className="w-3 h-3" />
             <span>雲端同步中</span>
          </div>
        </div>
        
        <Dashboard logs={logs} />
      </header>

      <main className="px-5 space-y-6">
        {/* Input Form */}
        <section>
          <LogForm onAddLog={handleAddLog} />
        </section>

        {/* AI Insight Section */}
        <section>
           <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI 成長分析
              </h2>
              <button 
                onClick={handleGetInsight}
                disabled={loadingInsight || logs.length === 0}
                className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 disabled:opacity-50"
              >
                {loadingInsight ? '分析中...' : '重新分析'}
              </button>
           </div>
           
           {insight && (
             <div className="bg-purple-50 p-4 rounded-2xl text-sm text-gray-700 leading-relaxed border border-purple-100 shadow-sm animate-fade-in">
               <div className="whitespace-pre-line">{insight}</div>
             </div>
           )}
           {!insight && (
             <div className="bg-white p-4 rounded-2xl text-sm text-gray-400 text-center border border-gray-100 border-dashed">
               點擊分析以獲取 Jacob 的每週成長摘要。
             </div>
           )}
        </section>

        {/* Recent History */}
        <section>
          <h2 className="font-bold text-gray-800 text-lg mb-3">最近記錄</h2>
          <LogList logs={logs} onDeleteLog={handleDeleteLog} />
        </section>

        {/* Settings / Tools */}
        <section className="pt-4 border-t border-gray-200">
           <div className="grid grid-cols-1 gap-3">
             <button 
               onClick={() => exportLogsToJSON(logs)}
               className="py-3 flex items-center justify-center gap-2 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold"
             >
               <Download className="w-4 h-4" />
               匯出備份 (JSON)
             </button>
           </div>
           <p className="text-center text-xs text-gray-400 mt-2">
             * 資料已啟用即時雲端同步
           </p>
        </section>
      </main>
    </div>
  );
};

export default App;