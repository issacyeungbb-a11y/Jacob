import React, { useMemo, useState } from 'react';
import { BabyLog, LogType, HealthLog } from '../types';
import { Activity, Weight, Ruler } from 'lucide-react';

interface HealthChartProps {
  logs: BabyLog[];
}

type HealthMetric = 'WEIGHT' | 'HEIGHT' | 'HEAD';

export const HealthChart: React.FC<HealthChartProps> = ({ logs }) => {
  const [metric, setMetric] = useState<HealthMetric>('WEIGHT');

  // Filter and prepare data
  const data = useMemo(() => {
    // 1. Filter only health logs
    const healthLogs = logs.filter(l => l.type === LogType.HEALTH) as HealthLog[];
    
    // 2. Extract relevant metric and sort by date ascending
    const points = healthLogs
      .map(l => {
        let value = 0;
        if (metric === 'WEIGHT') value = l.weightKg || 0;
        if (metric === 'HEIGHT') value = l.heightCm || 0;
        if (metric === 'HEAD') value = l.headCircumferenceCm || 0;
        
        return {
            date: new Date(l.timestamp),
            value: value,
            id: l.id
        };
      })
      .filter(p => p.value > 0) // Remove entries without the selected metric
      .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort Chronologically

    return points;
  }, [logs, metric]);

  // Chart Dimensions
  const height = 200;
  const padding = 20;

  // Render Logic
  const renderChart = () => {
    if (data.length < 2) {
        return (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                需要至少兩筆{getLabel()}記錄來顯示趨勢
            </div>
        );
    }

    const minVal = Math.min(...data.map(d => d.value)) * 0.95; // 5% buffer bottom
    const maxVal = Math.max(...data.map(d => d.value)) * 1.05; // 5% buffer top
    const range = maxVal - minVal;

    // Helper to scale Y
    const getY = (val: number) => {
        return height - ((val - minVal) / range) * (height - padding * 2) - padding;
    };

    // Helper to scale X
    // We space points equally to make it readable, rather than strictly by time, 
    // but show dates on X axis.
    const getX = (index: number) => {
        return (index / (data.length - 1)) * 100;
    };

    // Build SVG Path
    const pathD = data.map((d, i) => {
        const x = getX(i);
        const y = getY(d.value);
        return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
    }).join(' ');

    return (
        <div className="relative h-[220px] w-full mt-4 select-none">
            {/* Y Axis Labels (Min/Max) */}
            <div className="absolute left-0 top-0 bottom-6 w-full pointer-events-none opacity-20">
                <div className="border-t border-emerald-500 w-full absolute" style={{ top: padding }}></div>
                <div className="border-t border-emerald-500 w-full absolute" style={{ bottom: padding }}></div>
            </div>

            <svg className="w-full h-[200px] overflow-visible">
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                    </linearGradient>
                </defs>

                {/* Area under curve (Optional, requires closing path) */}
                {/* Line */}
                <path 
                    d={pathD} 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                />

                {/* Dots & Labels */}
                {data.map((d, i) => {
                    const y = getY(d.value);
                    const xPct = getX(i);
                    
                    return (
                        <g key={d.id}>
                            {/* Dot */}
                            <circle cx={`${xPct}%`} cy={y} r="4" fill="white" stroke="#10b981" strokeWidth="2" />
                            
                            {/* Value Label */}
                            <text 
                                x={`${xPct}%`} 
                                y={y - 12} 
                                textAnchor="middle" 
                                fill="#047857" 
                                fontSize="11" 
                                fontWeight="bold"
                            >
                                {d.value}
                            </text>

                            {/* Date Label (Bottom) */}
                            <text 
                                x={`${xPct}%`} 
                                y={215} 
                                textAnchor="middle" 
                                fill="#9ca3af" 
                                fontSize="10"
                            >
                                {d.date.toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
  };

  const getLabel = () => {
      if (metric === 'WEIGHT') return '體重';
      if (metric === 'HEIGHT') return '身高';
      return '頭圍';
  }

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mt-6">
       <div className="flex flex-col gap-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              生長曲線
          </h3>
          
          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl w-fit">
             <button
                onClick={() => setMetric('WEIGHT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${metric === 'WEIGHT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
             >
                <Weight className="w-3 h-3" /> 體重
             </button>
             <button
                onClick={() => setMetric('HEIGHT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${metric === 'HEIGHT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
             >
                <Ruler className="w-3 h-3" /> 身高
             </button>
             <button
                onClick={() => setMetric('HEAD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${metric === 'HEAD' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
             >
                <Activity className="w-3 h-3" /> 頭圍
             </button>
          </div>
       </div>

       {renderChart()}
       
       {data.length > 0 && (
           <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                 最新{getLabel()}: <span className="font-bold text-emerald-600 text-sm">{data[data.length-1].value} {metric === 'WEIGHT' ? 'kg' : 'cm'}</span>
              </p>
           </div>
       )}
    </div>
  );
};