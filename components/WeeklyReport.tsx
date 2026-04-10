import React, { useMemo, useState, useEffect } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog, DiaperLog, WeeklyAIReport } from '../types';
import { Calendar, Milk, Moon, Baby, TrendingUp, Info, Sparkles, BrainCircuit, Loader2, ChevronRight, ChevronLeft, Clock } from 'lucide-react';
import { BIRTH_DATE, BABY_NAME } from '../constants';
import { generateWeeklyAIReport, generateBabyInsights } from '../services/geminiService';
import { saveWeeklyReport, subscribeToWeeklyReports } from '../services/storageService';
import ReactMarkdown from 'react-markdown';

interface WeeklyReportProps {
  logs: BabyLog[];
  isGenerating?: boolean;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ logs, isGenerating = false }) => {
  const [weeklyReports, setWeeklyReports] = useState<WeeklyAIReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToWeeklyReports(setWeeklyReports);
    return () => unsubscribe();
  }, []);

  const currentWeekInfo = useMemo(() => {
    const birth = new Date(BIRTH_DATE);
    const now = new Date();
    
    // Adjust to HKT (UTC+8) for calculation
    const hktOffset = 8 * 60 * 60 * 1000;
    const nowHKT = new Date(now.getTime() + hktOffset);
    
    const diffTime = now.getTime() - birth.getTime();
    const weekNum = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;
    const months = parseFloat((diffTime / (30.44 * 24 * 60 * 60 * 1000)).toFixed(1));
    
    // Find this week's Friday 8 PM HKT
    const dayOfWeekHKT = nowHKT.getUTCDay(); // 0 (Sun) to 6 (Sat)
    
    let thisFridayHKT = new Date(nowHKT);
    if (dayOfWeekHKT <= 5) {
      thisFridayHKT.setUTCDate(nowHKT.getUTCDate() + (5 - dayOfWeekHKT));
    } else {
      thisFridayHKT.setUTCDate(nowHKT.getUTCDate() - (dayOfWeekHKT - 5));
    }
    thisFridayHKT.setUTCHours(20, 0, 0, 0);

    const isFriday8PMReached = nowHKT >= thisFridayHKT;

    // Calculate next report date
    let nextFridayHKT = new Date(thisFridayHKT);
    if (isFriday8PMReached) {
      nextFridayHKT.setUTCDate(thisFridayHKT.getUTCDate() + 7);
    }

    return { weekNum, months, isFriday8PMReached, thisFridayHKT, nextFridayHKT, nowHKT };
  }, []);

  const handleManualGenerate = async () => {
    if (localIsGenerating || isGenerating) return;
    setLocalIsGenerating(true);
    try {
      const dateStr = new Date().toLocaleDateString('zh-HK', { 
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Hong_Kong' 
      });
      const content = await generateWeeklyAIReport(
        logs, 
        currentWeekInfo.weekNum, 
        currentWeekInfo.months, 
        dateStr
      );
      
      const reportId = `week-${currentWeekInfo.weekNum}-${new Date().toISOString().split('T')[0]}`;
      const newReport: WeeklyAIReport = {
        id: reportId,
        weekNum: currentWeekInfo.weekNum,
        dateRange: `${new Date(Date.now() - 6 * 24 * 3600 * 1000).toLocaleDateString('zh-HK')} - ${new Date().toLocaleDateString('zh-HK')}`,
        content,
        createdAt: new Date().toISOString()
      };
      
      await saveWeeklyReport(newReport);
      setSelectedReportId(reportId);
      console.log("Manual generation successful:", reportId);
    } catch (error) {
      console.error("Manual generation failed:", error);
      alert("產生週報失敗，請檢查網路連線或稍後再試。");
    } finally {
      setLocalIsGenerating(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const selectedReport = useMemo(() => {
    return weeklyReports.find(r => r.id === selectedReportId) || (weeklyReports.length > 0 ? weeklyReports[0] : null);
  }, [weeklyReports, selectedReportId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-amber-300" />
            AI 深度週報
          </h2>
          <div className="space-y-2">
            <p className="text-indigo-100 text-sm leading-relaxed">
              每週五晚上 8:00 自動解鎖，為 Jacob 提供最專業的成長分析與育兒建議。
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Clock className="w-3 h-3 text-amber-300" />
              <span className="text-[10px] font-bold tracking-wider uppercase">
                下次更新：{currentWeekInfo.nextFridayHKT.getUTCMonth() + 1}月{currentWeekInfo.nextFridayHKT.getUTCDate()}日 20:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Weekly Report Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            歷史週報
          </h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-full">
            Gemini 3.1 Pro
          </span>
        </div>

        {/* Loading State for Auto-generation */}
        {(isGenerating || localIsGenerating) && (
          <div className="bg-white rounded-3xl p-8 text-center border border-indigo-100 shadow-sm space-y-4 animate-pulse">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <div className="space-y-2">
              <p className="font-black text-indigo-900">正在為 Jacob 編寫第 {currentWeekInfo.weekNum} 週週報</p>
              <p className="text-xs text-gray-500">AI 正在分析本週數據，請稍候...</p>
            </div>
          </div>
        )}

        {/* Manual Generate Fallback */}
        {!weeklyReports.some(r => r.weekNum === currentWeekInfo.weekNum) && !isGenerating && !localIsGenerating && (
          <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 text-center space-y-4 shadow-sm">
            <div className="space-y-2">
              <p className="font-black text-indigo-900 text-lg">第 {currentWeekInfo.weekNum} 週週報</p>
              <p className="text-xs text-indigo-600 font-medium">
                {currentWeekInfo.isFriday8PMReached 
                  ? "Jacob 的本週深度分析已準備就緒。" 
                  : `系統預計於週五 20:00 自動產生。如果您現在需要，也可以手動提前產生。`}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleManualGenerate}
                className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 mx-auto active:scale-95 transition-all w-full max-w-xs"
              >
                <BrainCircuit className="w-6 h-6" />
                立即產生週報
              </button>
              <button 
                onClick={handleRefresh}
                className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                重新整理頁面
              </button>
            </div>
          </div>
        )}

        {/* Debug Info Toggle */}
        <div className="flex justify-center">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-[9px] text-gray-300 font-bold uppercase tracking-widest hover:text-gray-500 transition-colors"
          >
            {showDebug ? "隱藏系統資訊" : "顯示系統資訊"}
          </button>
        </div>

        {showDebug && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 font-mono text-[10px] text-gray-500 space-y-1">
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>系統時間 (HKT)</span>
              <span className="text-gray-900">{currentWeekInfo.nowHKT.toLocaleString('zh-HK')}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>當前週數</span>
              <span className="text-gray-900">{currentWeekInfo.weekNum}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>本週解鎖時間 (HKT)</span>
              <span className="text-gray-900">{currentWeekInfo.thisFridayHKT.toLocaleString('zh-HK')}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>是否已達解鎖時間</span>
              <span className={currentWeekInfo.isFriday8PMReached ? "text-green-600 font-bold" : "text-amber-600"}>
                {currentWeekInfo.isFriday8PMReached ? "YES" : "NO"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>已儲存報告數量</span>
              <span className="text-gray-900">{weeklyReports.length}</span>
            </div>
          </div>
        )}

        {/* Status Message when not reached Friday 8PM and no reports exist yet */}
        {!currentWeekInfo.isFriday8PMReached && weeklyReports.length === 0 && (
          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 text-center space-y-3">
            <Clock className="w-10 h-10 text-amber-500 mx-auto opacity-50" />
            <div className="space-y-1">
              <p className="font-black text-amber-800">首份週報編寫中</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                Jacob 的第一份 AI 深度週報將於以下時間解鎖：<br/>
                <span className="font-black text-amber-700">{currentWeekInfo.thisFridayHKT.getUTCMonth() + 1}月{currentWeekInfo.thisFridayHKT.getUTCDate()}日 20:00</span>
              </p>
            </div>
          </div>
        )}

        {/* Report Display (Always show if reports exist) */}
        {selectedReport && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">第 {selectedReport.weekNum} 週報告</p>
                  <p className="text-xs font-bold text-gray-600">{selectedReport.dateRange}</p>
                </div>
                <div className="flex gap-2">
                  {weeklyReports.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          const idx = weeklyReports.findIndex(r => r.id === selectedReport.id);
                          if (idx < weeklyReports.length - 1) setSelectedReportId(weeklyReports[idx + 1].id);
                        }}
                        disabled={weeklyReports.findIndex(r => r.id === selectedReport.id) === weeklyReports.length - 1}
                        className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          const idx = weeklyReports.findIndex(r => r.id === selectedReport.id);
                          if (idx > 0) setSelectedReportId(weeklyReports[idx - 1].id);
                        }}
                        disabled={weeklyReports.findIndex(r => r.id === selectedReport.id) === 0}
                        className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 prose prose-sm max-w-none prose-headings:text-indigo-900 prose-headings:font-black prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700">
                <ReactMarkdown>{selectedReport.content}</ReactMarkdown>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-medium italic">
                  此報告由 Gemini 3.1 Pro 生成，僅供參考。如有醫療疑問請諮詢專業醫生。
                </p>
              </div>
            </div>

            {/* Next report info if we are viewing the latest one */}
            {!currentWeekInfo.isFriday8PMReached && selectedReport.weekNum === currentWeekInfo.weekNum - 1 && (
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50 flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs text-indigo-800 font-medium">
                  下一份週報將於 <span className="font-bold">{currentWeekInfo.thisFridayHKT.getUTCMonth() + 1}月{currentWeekInfo.thisFridayHKT.getUTCDate()}日 20:00</span> 自動產生。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
