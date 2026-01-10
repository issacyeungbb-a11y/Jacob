
import React, { useMemo, useState } from 'react';
import { BabyLog, LogType, HealthLog } from '../types';
import { Activity, Weight, Ruler, Info } from 'lucide-react';

interface HealthChartProps {
  logs: BabyLog[];
}

type HealthMetric = 'WEIGHT' | 'HEIGHT' | 'HEAD';

export const HealthChart: React.FC<HealthChartProps> = ({ logs }) => {
  const [metric, setMetric] = useState<HealthMetric>('WEIGHT');

  const data = useMemo(() => {
    const healthLogs = logs.filter(l => l.type === LogType.HEALTH) as HealthLog[];
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
      .filter(p => p.value > 0 && !isNaN(p.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return points;
  }, [logs, metric]);

  const height = 200;
  const padding = 20;

  const renderChart = () => {
    if (data.length === 0) {
        return (
            <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 text-center">
                <Info className="w-8 h-8 mb-2 opacity-20" />
                <p>尚無{getLabel()}數據</p>
                <p className="text-[10px]">請在「新增記錄 > 健康」中輸入</p>
            </div>
        );
    }

    if (data.length === 1) {
        return (
            <div className="h-[200px] flex flex-col items-center justify-center bg-emerald-50 rounded-xl border border-emerald-100 p-6 text-center">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    {metric === 'WEIGHT' ? <Weight className="w-8 h-8 text-emerald-500" /> : <Ruler className="w-8 h-8 text-emerald-500" />}
                </div>
                <p className="text-gray-500 text-xs mb-1">第一筆紀錄已儲存</p>
                <p className="text-3xl font-black text-emerald-700">{data[0].value} <span className="text-sm font-normal">{metric === 'WEIGHT' ? 'kg' : 'cm'}</span></p>
                <p className="text-[10px] text-emerald-400 mt-2">再輸入一筆即可顯示趨勢曲線</p>
            </div>
        );
    }

    const minVal = Math.min(...data.map(d => d.value)) * 0.98;
    const maxVal = Math.max(...data.map(d => d.value)) * 1.02;
    const range = Math.max(maxVal - minVal, 0.1);

    const getY = (val: number) => {
        return height - ((val - minVal) / range) * (height - padding * 2) - padding;
    };

    const getX = (index: number) => {
        return (index / (data.length - 1)) * 100;
    };

    const pathD = data.map((d, i) => {
        const x = getX(i);
        const y = getY(d.value);
        return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
    }).join(' ');

    return (
        <div className="relative h-[220px] w-full mt-4 select-none">
            <div className="absolute left-0 top-0 bottom-6 w-full pointer-events-none opacity-20">
                <div className="border-t border-emerald-500 w-full absolute" style={{ top: padding }}></div>
                <div className="border-t border-emerald-500 w-full absolute" style={{ bottom: padding }}></div>
            </div>

            <svg className="w-full h-[200px] overflow-visible">
                <path 
                    d={pathD} 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                />

                {data.map((d, i) => {
                    const y = getY(d.value);
                    const xPct = getX(i);
                    return (
                        <g key={d.id}>
                            <circle cx={`${xPct}%`} cy={y} r="4" fill="white" stroke="#10b981" strokeWidth="2" />
                            <text x={`${xPct}%`} y={y - 12} textAnchor="middle" fill="#047857" fontSize="11" fontWeight="bold">
                                {d.value}
                            </text>
                            <text x={`${xPct}%`} y={215} textAnchor="middle" fill="#9ca3af" fontSize="10">
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
           <div className="mt-4 text-center bg-emerald-50 py-2 rounded-xl">
              <p className="text-xs text-gray-500">
                 最新{getLabel()}: <span className="font-bold text-emerald-600 text-sm">{data[data.length-1].value} {metric === 'WEIGHT' ? 'kg' : 'cm'}</span>
              </p>
           </div>
       )}
    </div>
  );
};
