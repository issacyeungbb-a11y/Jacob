import React, { useState, useEffect } from 'react';
import { BabyLog } from './types';
import { getLogs, saveLogs, exportLogsToJSON } from './services/storageService';
import { generateBabyInsights } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { LogForm } from './components/LogForm';
import { LogList } from './components/LogList';
import { Sparkles, Calendar, Download, Baby } from 'lucide-react';
import { BABY_NAME, BIRTH_DATE } from './constants';

const App: React.FC = () => {
  const [logs, setLogs] = useState<BabyLog[]>([]);
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    setLogs(getLogs());
  }, []);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  const handleAddLog = (newLog: BabyLog) => {
    setLogs(prev => [newLog, ...prev]);
  };

  const handleDeleteLog = (id: string) => {
    if (confirm("確定刪除這條記錄嗎？")) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleGetInsight = async () => {
    if (logs.length === 0) return;
    setLoadingInsight(true);
    const result = await generateBabyInsights(logs);
    setInsight(result);
    setLoadingInsight(false);
  };

  // Calculate Age (Inclusive of birth day, so +1)
  const birth = new Date(BIRTH_DATE);
  const now = new Date();
  // Set time to midnight for accurate day calculation
  const birthDay = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Calculate difference in days and add 1 to count the birth day as Day 1
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
           <button 
             onClick={() => exportLogsToJSON(logs)}
             className="w-full py-3 flex items-center justify-center gap-2 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold"
           >
             <Download className="w-4 h-4" />
             匯出資料備份 (JSON)
           </button>
        </section>
      </main>
    </div>
  );
};

export default App;