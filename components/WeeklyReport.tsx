
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

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => new Date(log.timestamp) >= sevenDaysAgo);
    
    // Group by day
    const dailyData: Record<string, { milk: number, sleep: number, diapers: number }> = {};
    
    recentLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString();
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { milk: 0, sleep: 0, diapers: 0 };
      }
      
      if (log.type === LogType.FEED) {
        dailyData[dateStr].milk += (log as FeedLog).amountMl || 0;
      } else if (log.type === LogType.SLEEP) {
        dailyData[dateStr].sleep += (log as SleepLog).durationMinutes || 0;
      } else if (log.type === LogType.DIAPER) {
        dailyData[dateStr].diapers += 1;
      }
    });

    const days = Object.keys(dailyData);
    const dayCount = days.length || 1;
    
    const totalMilk = Object.values(dailyData).reduce((sum, d) => sum + d.milk, 0);
    const totalSleep = Object.values(dailyData).reduce((sum, d) => sum + d.sleep, 0);
    const totalDiapers = Object.values(dailyData).reduce((sum, d) => sum + d.diapers, 0);

    return {
      avgMilk: Math.round(totalMilk / dayCount),
      avgSleep: Math.round(totalSleep / dayCount),
      avgDiapers: (totalDiapers / dayCount).toFixed(1),
      totalMilk,
      totalSleep,
      totalDiapers,
      dayCount
    };
  }, [logs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Calendar className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-300" />
            每週成長報告
          </h2>
          <p className="text-indigo-100 text-sm leading-relaxed">
            總結過去 7 天的數據，助您掌握 Jacob 的成長趨勢。
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Milk Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-50 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <Milk className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">平均每日奶量</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{weeklyStats.avgMilk}</span>
              <span className="text-sm font-bold text-gray-500">ml</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">總計</p>
            <p className="text-sm font-black text-blue-600">{weeklyStats.totalMilk} ml</p>
          </div>
        </div>

        {/* Sleep Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-indigo-50 flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-2xl">
            <Moon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">平均每日睡眠</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{Math.floor(weeklyStats.avgSleep / 60)}h {weeklyStats.avgSleep % 60}m</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">總計</p>
            <p className="text-sm font-black text-indigo-600">{Math.floor(weeklyStats.totalSleep / 60)}h</p>
          </div>
        </div>

        {/* Diaper Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-50 flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <Baby className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">平均每日換片</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{weeklyStats.avgDiapers}</span>
              <span className="text-sm font-bold text-gray-500">次</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">總計</p>
            <p className="text-sm font-black text-amber-600">{weeklyStats.totalDiapers} 次</p>
          </div>
        </div>
      </div>

      {/* Summary Note */}
      <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-blue-800">小提示</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            這份週報是基於您過去 {weeklyStats.dayCount} 天的記錄自動生成的。規律的記錄有助於更準確地分析 Jacob 的成長狀況。
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
