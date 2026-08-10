// 成長點滴分類：頭五個同 constants.ts 嘅 MILESTONES（CDC 發展指標）同名，
// 所以記低一件事之後可以直接對返「里程碑對照指引」睇嗰個月齡應有嘅表現。
// 後兩個係家長實際會記、但唔屬於發展指標嘅嘢。

import { MilestoneLog, MomentCategory } from '../types';

export interface CategoryDef {
  key: MomentCategory;
  icon: string;
  short: string;          // 篩選掣用嘅短名
  hint: string;           // 輸入表單嘅例子
  dot: string;            // 實色（月曆格仔標記）
  chip: string;           // 淺色底＋文字（標籤）
  ring: string;           // 選中邊框
}

export const MOMENT_CATEGORIES: CategoryDef[] = [
  {
    key: '大肌肉', icon: '🦿', short: '大肌肉', hint: '抬頭、翻身、坐、爬、企、行',
    dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700 border-blue-200', ring: 'border-blue-500 bg-blue-50',
  },
  {
    key: '細肌肉', icon: '✋', short: '細肌肉', hint: '抓握、拍手、自己揸嘢食',
    dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'border-emerald-500 bg-emerald-50',
  },
  {
    key: '語言/溝通', icon: '🗣️', short: '語言', hint: '發聲、牙牙學語、叫爸爸媽媽',
    dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', ring: 'border-amber-500 bg-amber-50',
  },
  {
    key: '社交/情緒', icon: '❤️', short: '社交情緒', hint: '笑、認人、怕生、撒嬌、扭計',
    dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200', ring: 'border-rose-500 bg-rose-50',
  },
  {
    key: '認知', icon: '🧠', short: '認知', hint: '好奇探索、模仿、追視、搵嘢',
    dot: 'bg-purple-500', chip: 'bg-purple-50 text-purple-700 border-purple-200', ring: 'border-purple-500 bg-purple-50',
  },
  {
    key: '生活體驗', icon: '🎉', short: '生活體驗', hint: '出遊、節日、第一次去邊度、新食物',
    dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200', ring: 'border-sky-500 bg-sky-50',
  },
  {
    key: '健康護理', icon: '🏥', short: '健康', hint: '出牙、病、打針反應',
    dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200', ring: 'border-red-500 bg-red-50',
  },
  {
    key: '其他', icon: '📝', short: '其他', hint: '未歸類嘅記錄',
    dot: 'bg-slate-400', chip: 'bg-slate-50 text-slate-600 border-slate-200', ring: 'border-slate-400 bg-slate-50',
  },
];

export const CATEGORY_MAP: Record<MomentCategory, CategoryDef> =
  MOMENT_CATEGORIES.reduce((acc, c) => { acc[c.key] = c; return acc; }, {} as Record<MomentCategory, CategoryDef>);

// 舊記錄冇分類欄位，用關鍵字推斷返。順序有意義：
// 健康／生活體驗擺前面，因為「出牙」「去公園」嗰類講法唔應該被發展類詞搶先。
const RULES: { key: MomentCategory; words: string[] }[] = [
  { key: '健康護理', words: ['出牙', '長牙', '牙仔', '發燒', '燒', '咳', '感冒', '病', '嘔奶', '濕疹', '敏感', '打針', '疫苗', '醫生', '睇醫', '健康院', '便秘', '肚痾'] },
  { key: '生活體驗', words: ['去', '出街', '公園', '旅行', '沙灘', '泳', '玩水', '節', '聖誕', '新年', '生日', '影相', '全家福', '第一次食', '試食', '食物', '餐廳', '飲茶'] },
  { key: '大肌肉', words: ['抬頭', '翻身', '坐', '爬', '企', '站', '行', '走', '踢', '扶', '跳', '轉身', '趴'] },
  { key: '細肌肉', words: ['抓', '揸', '拍手', '執', '捏', '夾', '拎', '搖', '掀', '自己食', '奶樽'] },
  { key: '語言/溝通', words: ['叫', '講', '話', '發聲', '咿', '呀呀', '牙牙', '爸爸', '媽媽', '應', '笑聲', '出聲', '模仿聲'] },
  { key: '社交/情緒', words: ['笑', '扭計', '撒嬌', '認人', '怕', '嬲', '錫', '攬', '開心', '喊', '黐', '眼淚', '情緒'] },
  { key: '認知', words: ['好奇', '追視', '望', '睇住', '模仿', '學識', '識得', '記得', '搵', '發現', '探索', '認得'] },
];

/** 由標題同內文推斷分類；搵唔到就當「其他」 */
export const inferCategory = (log: MilestoneLog): MomentCategory => {
  if (log.category && CATEGORY_MAP[log.category]) return log.category;
  const text = `${log.title || ''} ${log.notes || ''}`;
  if (!text.trim()) return '其他';
  for (const rule of RULES) {
    if (rule.words.some(w => text.includes(w))) return rule.key;
  }
  return '其他';
};
