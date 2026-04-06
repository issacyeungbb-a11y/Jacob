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

    // Calculate next report date
    let nextFriday = new Date(thisFriday);
    if (isFriday8PMReached) {
      nextFriday.setDate(thisFriday.getDate() + 7);
    }

    return { weekNum, months, isFriday8PMReached, thisFriday, nextFriday };
  }, []);

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
                下次更新：{currentWeekInfo.nextFriday.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' })} 20:00
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
        {isGenerating && (
          <div className="bg-white rounded-3xl p-8 text-center border border-indigo-100 shadow-sm space-y-4 animate-pulse">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <div className="space-y-2">
              <p className="font-black text-indigo-900">正在為 Jacob 編寫第 {currentWeekInfo.weekNum} 週週報</p>
              <p className="text-xs text-gray-500">AI 正在分析本週數據，請稍候...</p>
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
                <span className="font-black text-amber-700">{currentWeekInfo.thisFriday.toLocaleString('zh-HK', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
                  下一份週報將於 <span className="font-bold">{currentWeekInfo.thisFriday.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric' })} 20:00</span> 自動產生。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
