import React, { useMemo, useState } from 'react';
import { BabyLog, LogType, MilestoneLog } from '../types';
import { MILESTONES } from '../constants';
import { BIRTH_DATE, BABY_NAME } from '../services/config';
import { Flag, Sparkles, ChevronDown, ChevronUp, Calendar, Heart } from 'lucide-react';

interface MilestoneTrackerProps {
  logs: BabyLog[];
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ logs }) => {
  const [showReference, setShowReference] = useState(false);

  // Filter logs for special moments and sort desc by timestamp
  const momentLogs = useMemo(() => {
    return logs
      .filter((l): l is MilestoneLog => l.type === LogType.MILESTONE)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs]);

  // Group reference milestones by month
  const milestonesByMonth = useMemo(() => {
    const grouped: Record<number, typeof MILESTONES> = {};
    MILESTONES.forEach(m => {
      if (!grouped[m.month]) grouped[m.month] = [];
      grouped[m.month].push(m);
    });
    return grouped;
  }, []);

  // Helper to calculate baby age at the time of log
  const calculateAgeAtTime = (dateStr: string) => {
    try {
      const birth = new Date(BIRTH_DATE);
      const logDate = new Date(dateStr);
      const diffTime = logDate.getTime() - birth.getTime();
      if (diffTime < 0) return '出生前';
      
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30.4375);
      const days = Math.floor(diffDays % 30.4375);
      
      if (months === 0) {
        return `${days}天`;
      }
      return `${months}個月${days > 0 ? ` ${days}天` : ''}`;
    } catch {
      return '';
    }
  };

  const getLocalDateString = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    } catch {
      return '';
    }
  };

  const getTimeString = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: CUSTOM MOMENTS TIMELINE */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-extrabold text-purple-950 flex items-center gap-2 text-lg sm:text-xl">
              <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
              成長點滴札記
            </h3>
            <p className="text-xs text-purple-400 mt-1">
              {BABY_NAME} 成長過程中的特別時刻、趣事、情緒氣氛或隨手日常生活記錄。
            </p>
          </div>
          <span className="text-xs text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full font-bold flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-purple-500 fill-current" />
            共 {momentLogs.length} 篇
          </span>
        </div>

        {/* Moments Timeline */}
        {momentLogs.length > 0 ? (
          <div className="relative border-l border-purple-100 pl-4 sm:pl-6 ml-2 sm:ml-4 space-y-8 my-2">
            {momentLogs.map((log) => {
              const hasCustomTitle = !!(log.title || log.emoji);
              let displayEmoji = log.emoji || "✨";
              let displayTitle = log.title || "特別瞬間";
              
              // Fallback for legacy milestone log
              if (!hasCustomTitle && log.milestoneId) {
                const matchedM = MILESTONES.find(x => x.id === log.milestoneId);
                displayTitle = matchedM ? `[${matchedM.category}] ${matchedM.name}` : "里程碑紀錄";
                displayEmoji = "🏆";
              }

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Node Point with Emoji */}
                  <div className="absolute -left-[33px] sm:-left-[41px] top-1.5 w-[38px] h-[38px] sm:w-[44px] sm:h-[44px] rounded-full bg-purple-50 border-4 border-white flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform duration-200 select-none">
                    {displayEmoji}
                  </div>

                  {/* Moment Card Content */}
                  <div className="bg-gradient-to-br from-purple-50/20 to-purple-50/5 p-4 rounded-2xl border border-purple-100/50 hover:border-purple-200 transition-colors shadow-sm ml-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h4 className="font-black text-purple-950 text-sm sm:text-base flex items-center gap-2">
                        {displayTitle}
                      </h4>
                      
                      {/* Age and Date Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] sm:text-xs font-black text-purple-600 bg-purple-50 border border-purple-100/50 px-2 py-0.5 rounded-md whitespace-nowrap">
                          當時 {BABY_NAME} {calculateAgeAtTime(log.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* notes details */}
                    {log.notes ? (
                      <p className="text-gray-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap rounded-xl bg-white/70 p-3 border border-purple-100/30">
                        {log.notes}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-xs italic">無細節描述。</p>
                    )}

                    {/* Time Footer */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-3 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{getLocalDateString(log.timestamp)}</span>
                      <span className="text-gray-300">|</span>
                      <span>{getTimeString(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 px-6 bg-slate-50 border border-dashed border-gray-200 rounded-2xl max-w-lg mx-auto">
            <span className="text-4xl block mb-3 select-none">✍️</span>
            <h4 className="font-extrabold text-gray-600 mb-2">記錄 {BABY_NAME} 的第一個感動</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              尚未有成長點滴記錄。在下方的「成長點滴」分頁即可新增特別的回事、生活趣事或出遊心情唷！
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: REFERENCE CDC MILESTONES (COLLAPSIBLE ACCORDION) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowReference(!showReference)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Flag className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-gray-800 text-sm sm:text-base">里程碑對照指引 (輔助參考)</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">查看嬰幼兒在不同歲段的預期發展指標</p>
            </div>
          </div>
          {showReference ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showReference && (
          <div className="p-5 border-t border-gray-50 bg-gray-50/30 space-y-6 animate-fade-in">
            <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed max-w-2xl">
              💡 💡 <strong>小貼士：</strong>本發展指標由美國 CDC 疾病管制局 & 香港衞生署家庭健康服務提供，僅作大方向比對與指導。每個BB的步伐都是獨步天下、因人而異的，如有任何關於發展緩急的疑惑，請向母嬰健康院或兒科醫生進行諮詢。
            </div>

            <div className="space-y-8">
              {Object.entries(milestonesByMonth)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([month, milestones]) => (
                  <div key={month} className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-purple-100"></div>
                      <h4 className="text-xs sm:text-sm font-black text-purple-800 px-3 py-1 bg-purple-50 rounded-full border border-purple-100">
                        {month} 個月大 milestones
                      </h4>
                      <div className="h-px flex-1 bg-purple-100"></div>
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse font-sans">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 font-sans">
                            <th className="py-2.5 px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider w-20 sm:w-24">類別</th>
                            <th className="py-2.5 px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">里程碑內容</th>
                          </tr>
                        </thead>
                        <tbody>
                          {milestones.map((m) => (
                            <tr 
                              key={m.id} 
                              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <span className={`text-[9px] sm:text-[9.5px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap ${
                                  m.category.includes('大肌肉') ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                  m.category.includes('細肌肉') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  m.category.includes('語言') ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  m.category.includes('社交') ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                  'bg-purple-50 text-purple-600 border border-purple-100'
                                }`}>
                                  {m.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="text-xs font-semibold leading-relaxed text-gray-700">
                                  {m.name}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
