
import React, { useMemo, useState, useEffect } from 'react';
import { BabyLog, LogType, FeedLog, SleepLog, DiaperLog, WeeklyAIReport } from '../types';
import { Calendar, Milk, Moon, Baby, TrendingUp, Info, Sparkles, BrainCircuit, Loader2, ChevronRight, ChevronLeft, Clock } from 'lucide-react';
import { BIRTH_DATE, BABY_NAME } from '../constants';
import { generateWeeklyAIReport } from '../services/geminiService';
import { saveWeeklyReport, subscribeToWeeklyReports } from '../services/storageService';
import ReactMarkdown from 'react-markdown';

interface WeeklyReportProps {
  logs: BabyLog[];
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ logs }) => {
  const [weeklyReports, setWeeklyReports] = useState<WeeklyAIReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToWeeklyReports(setWeeklyReports);
    return () => unsubscribe();
  }, []);

  const currentWeekInfo = useMemo(() => {
    const birth = new Date(BIRTH_DATE);
    const now = new Date();
    const diffTime = now.getTime() - birth.getTime();
    const weekNum = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;
    const months = parseFloat((diffTime / (30.44 * 24 * 60 * 60 * 1000)).toFixed(1));
    
    // Find this week's Friday 8 PM
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    
    let thisFriday = new Date(today);
    if (dayOfWeek <= 5) {
      // Mon-Fri
      thisFriday.setDate(today.getDate() + (5 - dayOfWeek));
    } else {
      // Sat
      thisFriday.setDate(today.getDate() - (dayOfWeek - 5));
    }
    thisFriday.setHours(20, 0, 0, 0);

    const isFriday8PMReached = today >= thisFriday;

    return { weekNum, months, isFriday8PMReached, thisFriday };
  }, []);

  const handleGenerateReport = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const dateStr = new Date().toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric' });
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
        dateRange: `${new Date(Date.now() - 6 * 24 * 3600 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
        content,
        createdAt: new Date().toISOString()
      };
      
      await saveWeeklyReport(newReport);
      setSelectedReportId(reportId);
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("產生週報失敗，請稍後再試。");
    } finally {
      setIsGenerating(false);
    }
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
          <p className="text-indigo-100 text-sm leading-relaxed">
            每週五晚上 8:00 解鎖，為 Jacob 提供最專業的成長分析與育兒建議。
          </p>
        </div>
      </div>

      {/* AI Weekly Report Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            AI 深度週報
          </h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-full">
            Gemini 3.1 Pro
          </span>
        </div>

        {!currentWeekInfo.isFriday8PMReached && (
          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 text-center space-y-3">
            <Clock className="w-10 h-10 text-amber-500 mx-auto opacity-50" />
            <div className="space-y-1">
              <p className="font-black text-amber-800">未到發布時間</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                每週五晚上 8:00 將會解鎖本週的 AI 深度週報。<br/>
                距離下次發布還有：{currentWeekInfo.thisFriday.toLocaleString('zh-HK')}
              </p>
            </div>
          </div>
        )}

        {currentWeekInfo.isFriday8PMReached && (
          <div className="space-y-4">
            {/* Generate Button (if no report for current week) */}
            {(!selectedReport || selectedReport.weekNum !== currentWeekInfo.weekNum) && (
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full py-6 bg-gradient-to-r from-indigo-600 to-blue-700 text-white font-black rounded-3xl shadow-xl shadow-blue-100 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>正在編寫第 {currentWeekInfo.weekNum} 週週報...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-8 h-8" />
                    <span>產生第 {currentWeekInfo.weekNum} 週 AI 深度週報</span>
                    <span className="text-[10px] font-normal opacity-70">基於本週數據與發展里程碑</span>
                  </>
                )}
              </button>
            )}

            {/* Report Display */}
            {selectedReport && (
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
                          className="p-1 hover:bg-gray-200 rounded-full disabled:opacity-30"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            const idx = weeklyReports.findIndex(r => r.id === selectedReport.id);
                            if (idx > 0) setSelectedReportId(weeklyReports[idx - 1].id);
                          }}
                          disabled={weeklyReports.findIndex(r => r.id === selectedReport.id) === 0}
                          className="p-1 hover:bg-gray-200 rounded-full disabled:opacity-30"
                        >
                          <ChevronRight className="w-4 h-4" />
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};
